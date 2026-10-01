// Driver-term extraction: which words make a group of comments distinctive.
//
// Uses a log-odds ratio with add-k smoothing, comparing term frequency inside
// a group against the rest of the corpus. Plain frequency would just return
// "the", "course", "assignment" for every group; log-odds returns the terms
// that are unusually common HERE, which is what a lecturer actually needs.
import { isContentTerm, ngrams, tokenize } from './textUtils.js';

const SMOOTHING = 0.5;

function countTerms(docs) {
  const counts = new Map();
  let total = 0;
  for (const doc of docs) {
    // Count each term once per document, so one ranting comment cannot
    // dominate the vocabulary of the whole group.
    const seen = new Set(ngrams(tokenize(doc)));
    for (const term of seen) {
      if (!isContentTerm(term)) continue;
      counts.set(term, (counts.get(term) || 0) + 1);
      total += 1;
    }
  }
  return { counts, total };
}

/**
 * @param inGroup  documents in the group of interest
 * @param outGroup documents to compare against (the rest of the corpus)
 * @returns terms most distinctive of inGroup, strongest first
 */
export function driverTerms(inGroup, outGroup, { limit = 8, minDocs = 5, minShare = 0.02 } = {}) {
  if (inGroup.length < minDocs) return [];
  // A term must appear in a meaningful share of the group, not just 3 documents
  // out of 5,000 - otherwise log-odds surfaces rare noise.
  const floor = Math.max(minDocs, Math.ceil(inGroup.length * minShare));

  const a = countTerms(inGroup);
  const b = countTerms(outGroup);
  const vocabulary = new Set([...a.counts.keys(), ...b.counts.keys()]);
  const v = vocabulary.size || 1;

  const scored = [];
  for (const [term, inCount] of a.counts) {
    if (inCount < floor) continue;
    if (/\d/.test(term) || term.includes('name') || term.includes('staff')) continue;
    const outCount = b.counts.get(term) || 0;
    const pIn = (inCount + SMOOTHING) / (a.total + SMOOTHING * v);
    const pOut = (outCount + SMOOTHING) / (b.total + SMOOTHING * v);
    scored.push({
      term,
      score: Math.round(Math.log(pIn / pOut) * 100) / 100,
      docCount: inCount,
      share: Math.round((inCount / inGroup.length) * 100),
    });
  }

  return scored.sort((x, y) => y.score - x.score).slice(0, limit);
}
