// Sentiment inference in the browser using the weights exported by
// analytics/train_sentiment.py (TF-IDF + Logistic Regression, macro-F1 ~0.76
// against a ~0.40 majority baseline).
//
// Training happens offline in Python; only the fitted weights ship here. The
// same weights can be loaded by the backend later, so predictions stay
// identical wherever inference runs.
import { ngrams, termCounts, tokenize } from './textUtils.js';

let model = null;
let loading = null;

export async function loadSentimentModel() {
  if (model) return model;
  if (!loading) {
    loading = import('./sentiment-model.json')
      .then((m) => {
        model = m.default ?? m;
        return model;
      })
      .catch(() => {
        model = null; // caller falls back to the lexicon
        return null;
      });
  }
  return loading;
}

export function setSentimentModel(next) {
  model = next;
  loading = Promise.resolve(next);
}

export function getModelInfo() {
  if (!model) return { available: false, name: 'lexicon-fallback', version: '0' };
  return {
    available: true,
    name: model.name,
    version: model.version,
    features: Object.keys(model.weights).length,
    metrics: model.metrics,
    trainedOn: model.trained_on,
    nTrain: model.n_train,
  };
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

// Small fallback so the app still classifies if the model file is absent.
const POSITIVE = new Set(['great', 'excellent', 'clear', 'helpful', 'enjoyed', 'love', 'loved', 'interesting', 'best', 'good', 'useful', 'fair', 'easy', 'recommend', 'amazing', 'fun']);
const NEGATIVE = new Set(['confusing', 'unclear', 'boring', 'worst', 'bad', 'hard', 'difficult', 'disorganised', 'disorganized', 'useless', 'unfair', 'terrible', 'awful', 'rushed', 'outdated', 'frustrating', 'poor']);

function lexiconScore(text) {
  const tokens = tokenize(text);
  let score = 0;
  for (const t of tokens) {
    if (POSITIVE.has(t)) score += 1;
    if (NEGATIVE.has(t)) score -= 1;
  }
  const strength = Math.min(Math.abs(score) / 4, 1);
  if (score > 0) return { sentiment: 'positive', sentimentScore: 0.5 + 0.4 * strength };
  if (score < 0) return { sentiment: 'negative', sentimentScore: 0.5 + 0.4 * strength };
  return { sentiment: 'neutral', sentimentScore: 0.4 };
}

// Probabilities in this band are reported as neutral: the model is binary
// (liked / disliked), so "neutral" means "the model is not confident either way".
const NEUTRAL_LOW = 0.42;
const NEUTRAL_HIGH = 0.58;

export function predictSentiment(text) {
  if (!model) return lexiconScore(text);

  const counts = termCounts(ngrams(tokenize(text)));
  // Sublinear tf, multiplied by idf, over in-vocabulary terms only.
  const vector = [];
  let norm = 0;
  for (const [term, tf] of counts) {
    const w = model.weights[term];
    if (!w) continue;
    const value = (1 + Math.log(tf)) * w[0];
    vector.push([value, w[1]]);
    norm += value * value;
  }
  if (!vector.length) return { sentiment: 'neutral', sentimentScore: 0.35, matchedTerms: 0 };

  norm = Math.sqrt(norm) || 1;
  let z = model.intercept;
  for (const [value, coef] of vector) z += (value / norm) * coef;

  const pPositive = sigmoid(z);
  let sentiment = 'neutral';
  if (pPositive >= NEUTRAL_HIGH) sentiment = 'positive';
  else if (pPositive <= NEUTRAL_LOW) sentiment = 'negative';

  return {
    sentiment,
    // Confidence in the reported label, not the raw probability of "positive".
    sentimentScore: Math.round((sentiment === 'negative' ? 1 - pPositive : pPositive) * 100) / 100,
    pPositive: Math.round(pPositive * 1000) / 1000,
    matchedTerms: vector.length,
  };
}

// The terms in this comment that pushed the prediction hardest, so a lecturer
// can see WHY a comment was classified the way it was.
export function explainSentiment(text, limit = 5) {
  if (!model) return [];
  const counts = termCounts(ngrams(tokenize(text)));
  const contributions = [];
  for (const [term, tf] of counts) {
    const w = model.weights[term];
    if (!w) continue;
    contributions.push({ term, contribution: (1 + Math.log(tf)) * w[0] * w[1] });
  }
  return contributions
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, limit);
}
