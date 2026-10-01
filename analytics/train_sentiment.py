"""Train and evaluate the sentiment classifier, then export it for the app.

Pipeline: TF-IDF (1-2 grams) + Logistic Regression, evaluated against a
majority-class baseline on a held-out stratified test split.

Two models are fitted:
  1. FULL      - the whole vocabulary, for reference.
  2. COMPACT   - refitted on the top-K most informative features so the exported
                 weights are small enough to ship to the browser. The metrics we
                 report for the app are the COMPACT ones, because that is the
                 model the app actually runs.

Outputs:
  analytics/results/metrics.json          evaluation results
  analytics/results/top_terms.json        most positive / negative terms
  src/analysis/sentiment-model.json       weights consumed by the web app

Usage:
  python analytics/train_sentiment.py --csv data/raw/course_data_clean.csv
"""
import argparse
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (classification_report, confusion_matrix, f1_score,
                             precision_recall_fscore_support, roc_auc_score)
from sklearn.model_selection import train_test_split

SEED = 42
TOP_K = 6000          # features kept in the exported model
MIN_REVIEW_CHARS = 15  # ignore near-empty reviews

# Must match tokenize() in src/analysis/textUtils.js exactly.
TOKEN_PATTERN = r"(?u)\b\w\w+\b"


def load(csv_path):
    df = pd.read_csv(csv_path)
    df = df[["course_code", "course_title", "reviews", "course_rating", "course_rating_int"]]
    df = df.dropna(subset=["reviews", "course_rating_int"])
    df["reviews"] = df["reviews"].astype(str).str.strip()
    df = df[df["reviews"].str.len() >= MIN_REVIEW_CHARS]
    df = df.drop_duplicates(subset=["reviews"])          # identical text = leakage risk
    df["y"] = df["course_rating_int"].astype(int)
    return df.reset_index(drop=True)


def evaluate(name, y_true, y_pred, y_prob=None):
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, average=None, labels=[0, 1], zero_division=0)
    out = {
        "model": name,
        "accuracy": float((y_true == y_pred).mean()),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "per_class": {
            "disliked": {"precision": float(p[0]), "recall": float(r[0]), "f1": float(f[0])},
            "liked": {"precision": float(p[1]), "recall": float(r[1]), "f1": float(f[1])},
        },
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
    }
    if y_prob is not None:
        out["roc_auc"] = float(roc_auc_score(y_true, y_prob))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="data/raw/course_data_clean.csv")
    ap.add_argument("--top-k", type=int, default=TOP_K)
    args = ap.parse_args()

    root = Path(__file__).resolve().parent.parent
    results_dir = root / "analytics" / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    df = load(root / args.csv if not Path(args.csv).is_absolute() else args.csv)
    print(f"usable reviews: {len(df):,}  (liked={int(df.y.sum()):,}  disliked={int((1-df.y).sum()):,})")

    X_train, X_test, y_train, y_test = train_test_split(
        df["reviews"].values, df["y"].values, test_size=0.2, random_state=SEED, stratify=df["y"].values
    )
    print(f"train={len(X_train):,}  test={len(X_test):,}")

    # --- Baseline: always predict the majority class ---
    majority = int(pd.Series(y_train).mode()[0])
    baseline = evaluate("majority_baseline", y_test, np.full_like(y_test, majority))

    # --- FULL model ---
    vec_full = TfidfVectorizer(
        ngram_range=(1, 2), min_df=3, sublinear_tf=True,
        strip_accents="unicode", lowercase=True, token_pattern=TOKEN_PATTERN,
    )
    Xtr = vec_full.fit_transform(X_train)
    Xte = vec_full.transform(X_test)
    clf_full = LogisticRegression(max_iter=2000, C=4.0, class_weight="balanced", random_state=SEED)
    clf_full.fit(Xtr, y_train)
    full = evaluate("tfidf_logreg_full", y_test, clf_full.predict(Xte), clf_full.predict_proba(Xte)[:, 1])
    full["n_features"] = int(Xtr.shape[1])
    print(f"FULL    features={Xtr.shape[1]:,}  macro-F1={full['macro_f1']:.4f}")

    # --- COMPACT model: keep the most informative features, then refit ---
    coefs = clf_full.coef_[0]
    keep_idx = np.argsort(np.abs(coefs))[::-1][: args.top_k]
    vocab = [t for t, i in sorted(vec_full.vocabulary_.items(), key=lambda kv: kv[1])]
    keep_terms = sorted({vocab[i] for i in keep_idx})

    vec = TfidfVectorizer(
        ngram_range=(1, 2), sublinear_tf=True, strip_accents="unicode",
        lowercase=True, token_pattern=TOKEN_PATTERN, vocabulary=keep_terms,
    )
    Xtr2 = vec.fit_transform(X_train)
    Xte2 = vec.transform(X_test)
    clf = LogisticRegression(max_iter=2000, C=4.0, class_weight="balanced", random_state=SEED)
    clf.fit(Xtr2, y_train)
    compact = evaluate("tfidf_logreg_compact", y_test, clf.predict(Xte2), clf.predict_proba(Xte2)[:, 1])
    compact["n_features"] = int(Xtr2.shape[1])
    print(f"COMPACT features={Xtr2.shape[1]:,}  macro-F1={compact['macro_f1']:.4f}")
    print(f"BASELINE                macro-F1={baseline['macro_f1']:.4f}")
    print("\n" + classification_report(y_test, clf.predict(Xte2), target_names=["disliked", "liked"], zero_division=0))

    # --- Export for the browser ---
    terms = vec.get_feature_names_out()
    idf = vec.idf_
    coef = clf.coef_[0]
    model = {
        "name": "sentiment-tfidf-logreg",
        "version": "1.0.0",
        "trained_on": Path(args.csv).name,
        "n_train": int(len(X_train)),
        "classes": {"1": "positive", "0": "negative"},
        "intercept": float(clf.intercept_[0]),
        "sublinear_tf": True,
        "ngram_max": 2,
        # term -> [idf, coefficient]
        "weights": {t: [round(float(i), 4), round(float(c), 4)] for t, i, c in zip(terms, idf, coef)},
        "metrics": {"macro_f1": compact["macro_f1"], "accuracy": compact["accuracy"], "roc_auc": compact.get("roc_auc")},
    }
    model_path = root / "src" / "analysis" / "sentiment-model.json"
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text(json.dumps(model), encoding="utf8")
    print(f"\nexported {model_path.relative_to(root)}  ({model_path.stat().st_size/1024:.0f} KB)")

    order = np.argsort(coef)
    top_terms = {
        "most_negative": [{"term": terms[i], "coef": round(float(coef[i]), 3)} for i in order[:30]],
        "most_positive": [{"term": terms[i], "coef": round(float(coef[i]), 3)} for i in order[::-1][:30]],
    }
    (results_dir / "top_terms.json").write_text(json.dumps(top_terms, indent=2), encoding="utf8")

    metrics = {
        "dataset": {
            "file": Path(args.csv).name,
            "rows_usable": int(len(df)),
            "label_source": "course_rating_int (1 = liked, 0 = disliked)",
            "label_caveat": "A proxy for sentiment: it reflects overall course liking, not the polarity of the individual comment.",
            "split": {"method": "stratified random", "test_size": 0.2, "seed": SEED},
            "deduplicated": True,
            "min_review_chars": MIN_REVIEW_CHARS,
        },
        "baseline": baseline,
        "full_model": full,
        "compact_model_exported_to_app": compact,
    }
    (results_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf8")
    print(f"exported analytics/results/metrics.json")


if __name__ == "__main__":
    main()
