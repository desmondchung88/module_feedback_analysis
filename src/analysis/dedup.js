// Near-duplicate grouping.
//
// Why this matters: twenty students restating the same complaint is ONE issue
// raised twenty times, not twenty issues. Counting raw comments overstates the
// diversity of feedback, so the dashboard reports distinct issues alongside
// raw volume.
//
// Method: Jaccard similarity over token sets, with an inverted index on the
// rarest terms so only plausible candidates are compared (avoids O(n^2)).
import { isContentTerm, ngrams, tokenize } from './textUtils.js';

const SIMILARITY_THRESHOLD = 0.6;
const CANDIDATE_KEYS = 4;   // rarest terms indexed per document
const MAX_CANDIDATES = 60;  // safety cap per document

function signature(text) {
  return new Set(tokenize(text).filter((t) => isContentTerm(t)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const t of small) if (large.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * @param items [{ id, text }]
 * @returns { groups, distinctCount, duplicateCount }
 *          groups are clusters of size > 1, largest first
 */
export function groupNearDuplicates(items, { threshold = SIMILARITY_THRESHOLD } = {}) {
  const sigs = items.map((item) => ({ ...item, sig: signature(item.text) }));

  // Document frequency, so we can index each document by its rarest terms.
  const df = new Map();
  for (const { sig } of sigs) for (const t of sig) df.set(t, (df.get(t) || 0) + 1);

  const index = new Map();
  const parent = sigs.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (i, j) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[Math.max(ri, rj)] = Math.min(ri, rj);
  };

  sigs.forEach((doc, i) => {
    const keys = [...doc.sig].sort((a, b) => (df.get(a) || 0) - (df.get(b) || 0)).slice(0, CANDIDATE_KEYS);
    const candidates = new Set();
    for (const key of keys) {
      for (const j of index.get(key) ?? []) {
        candidates.add(j);
        if (candidates.size >= MAX_CANDIDATES) break;
      }
    }
    for (const j of candidates) {
      if (find(i) === find(j)) continue;
      if (jaccard(doc.sig, sigs[j].sig) >= threshold) union(i, j);
    }
    for (const key of keys) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(i);
    }
  });

  const clusters = new Map();
  sigs.forEach((doc, i) => {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(doc);
  });

  const groups = [...clusters.values()]
    .filter((members) => members.length > 1)
    .map((members) => {
      // The longest comment is used as the representative: it usually states
      // the issue most fully.
      const representative = members.reduce((a, b) => (b.text.length > a.text.length ? b : a));
      return {
        size: members.length,
        representative: { id: representative.id, text: representative.text },
        members: members.map((m) => ({ id: m.id, text: m.text })),
      };
    })
    .sort((a, b) => b.size - a.size);

  const duplicateCount = groups.reduce((sum, g) => sum + g.size - 1, 0);
  return { groups, distinctCount: items.length - duplicateCount, duplicateCount };
}
