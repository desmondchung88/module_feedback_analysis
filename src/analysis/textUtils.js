// Text preparation shared by every analysis step.
//
// tokenize() must mirror scikit-learn's TfidfVectorizer configuration used in
// analytics/train_sentiment.py: strip_accents="unicode", lowercase=True,
// token_pattern=r"(?u)\b\w\w+\b". If one changes, change both.
const TOKEN_RE = /[\p{L}\p{N}_]{2,}/gu;

export function normalise(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .toLowerCase();
}

export function tokenize(text) {
  return normalise(text).match(TOKEN_RE) ?? [];
}

// Unigrams plus bigrams, matching ngram_range=(1, 2).
export function ngrams(tokens, maxN = 2) {
  const out = [...tokens];
  for (let n = 2; n <= maxN; n += 1) {
    for (let i = 0; i + n <= tokens.length; i += 1) {
      out.push(tokens.slice(i, i + n).join(' '));
    }
  }
  return out;
}

export function termCounts(terms) {
  const counts = new Map();
  for (const t of terms) counts.set(t, (counts.get(t) || 0) + 1);
  return counts;
}

// Common words excluded from human-facing keyword lists (never from the model).
export const STOPWORDS = new Set(`a about after all also am an and any are as at be because been before being but by
can cant course could did do does doing dont down during each few for from further had has have having he her here
hers him his how i if in into is it its itself just me more most my no nor not of off on once only or other our out
over own really same she should so some such than that the their them then there these they this those through to
too under until up very was we were what when where which while who whom why will with you your class prof professor
lecture lectures took take taking get got would one thing things lot bit much many make makes made`.split(/\s+/));

export function isContentTerm(term) {
  return term.split(' ').every((w) => !STOPWORDS.has(w) && w.length > 2);
}
