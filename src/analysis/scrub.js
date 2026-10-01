// Removes identifying text from free-text comments before anything else sees it.
//
// Course reviews routinely name the instructor. Those names are personal data
// about a real person, so they are masked at ingest: nothing downstream (the
// model, the keyword extractor, the stored records, the UI) ever receives them.
//
// Three passes:
//   1. Titles followed by a name        "Prof. Alicia Tan"  -> [STAFF]
//   2. Emails and URLs                                       -> [EMAIL] / [LINK]
//   3. Rare capitalised words mid-sentence                    -> [NAME]
//
// Pass 3 is corpus-driven: a capitalised token that appears in very few
// documents and is not ordinary English is almost always a proper noun. It is
// deliberately conservative and WILL miss some names, so the caller receives a
// count and should audit a sample. Automated scrubbing reduces risk; it does
// not eliminate it.
const TITLE_NAME = /\b(prof(?:essor)?|dr|mr|mrs|ms|miss|sir|madam)\.?\s+[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?/gi;
const TITLE_ONLY = /\b(prof(?:essor)?|dr|mr|mrs|ms|miss|sir|madam)\b/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;

// Words that are often capitalised mid-sentence but are not people.
const ALLOWED_CAPITALS = new Set(`i a the this that it he she they we you my his her their our your if but and or so
monday tuesday wednesday thursday friday saturday sunday january february march april may june july august
september october november december english math maths calculus physics chemistry biology economics statistics
python java javascript racket matlab excel word linux windows mac google zoom teams canvas moodle piazza github
midterm midterms final finals exam exams quiz lab labs lecture lectures tutorial tutorials assignment assignments
prof professor ta tas university college school department faculty course courses term semester week weeks
overall however also though although really very just even still yes no ok okay great good bad
ai ml cs se it hr pdf url api sql html css
design recipe computer computing science sciences engineering software systems data business health arts
calculus algebra geometry statistics accounting marketing psychology sociology philosophy history geography
scheme easy hard there their theory practice project projects lab labs group groups team teams study studies
management finance operations analysis analytics networks security database databases algorithms programming
amazon microsoft apple intel nvidia oracle adobe
profs students student teachers instructors lecturers everyone someone anyone nobody everything something`.split(/\s+/));

const CAPITALISED = /(?<![.!?]\s|^)\b([A-Z][a-z]{2,})\b/g;

const LOWER_WORD = /([a-z]{3,})/g;

// Tracks, for every word, how often it appears capitalised mid-sentence versus
// in ordinary lowercase use. A real name is almost always capitalised; a common
// noun like "design" or "science" appears lowercase far more often.
function documentFrequencies(texts) {
  const capital = new Map();
  const lower = new Map();
  for (const text of texts) {
    const str = String(text);
    const seenCap = new Set();
    for (const m of str.matchAll(CAPITALISED)) seenCap.add(m[1].toLowerCase());
    for (const w of seenCap) capital.set(w, (capital.get(w) || 0) + 1);
    const seenLow = new Set();
    for (const m of str.matchAll(LOWER_WORD)) seenLow.add(m[1]);
    for (const w of seenLow) lower.set(w, (lower.get(w) || 0) + 1);
  }
  return { capital, lower };
}

/**
 * @param texts array of raw comment strings
 * @returns { texts: scrubbed[], stats }
 */
export function scrubCorpus(texts, { rareThreshold = 0.0025 } = {}) {
  const { capital, lower } = documentFrequencies(texts);
  const maxDocs = Math.max(2, Math.floor(texts.length * rareThreshold));

  const stats = { titles: 0, emails: 0, links: 0, rareNames: 0, documentsChanged: 0, maskedTerms: new Set() };

  const scrubbed = texts.map((raw) => {
    let text = String(raw ?? '');
    const before = text;

    // Keep the title word itself: "prof" is a useful theme signal, the name is not.
    text = text.replace(TITLE_NAME, (m) => {
      stats.titles += 1;
      return `${(m.match(TITLE_ONLY) || ['prof'])[0]} [NAME]`;
    });
    text = text.replace(EMAIL, () => { stats.emails += 1; return '[EMAIL]'; });
    text = text.replace(URL, () => { stats.links += 1; return '[LINK]'; });
    text = text.replace(CAPITALISED, (match, word) => {
      const key = word.toLowerCase();
      if (ALLOWED_CAPITALS.has(key)) return match;
      const capDocs = capital.get(key) || 0;
      const lowerDocs = lower.get(key) || 0;
      if (capDocs > maxDocs) return match;          // too common to be one person
      if (lowerDocs >= capDocs) return match;       // also used as an ordinary word
      stats.rareNames += 1;
      stats.maskedTerms.add(key);
      return '[NAME]';
    });

    if (text !== before) stats.documentsChanged += 1;
    return text;
  });

  return {
    texts: scrubbed,
    stats: {
      ...stats,
      maskedTerms: [...stats.maskedTerms].slice(0, 50),
      distinctMaskedTerms: stats.maskedTerms.size,
      documentsChangedPct: texts.length ? Math.round((stats.documentsChanged / texts.length) * 1000) / 10 : 0,
    },
  };
}

// Anything that still looks like an identifier after scrubbing, for spot-audits.
export function auditResiduals(texts, sampleSize = 100) {
  const suspects = [];
  const step = Math.max(1, Math.floor(texts.length / sampleSize));
  for (let i = 0; i < texts.length && suspects.length < sampleSize; i += step) {
    const hits = [...String(texts[i]).matchAll(TITLE_NAME)].map((m) => m[0]);
    if (hits.length) suspects.push({ index: i, hits });
  }
  return { sampled: Math.min(sampleSize, texts.length), suspects };
}
