// Theme classification: which aspect of the module a comment is about.
//
// This is a transparent seeded-keyword classifier, not a trained model. It was
// chosen deliberately: the dataset carries sentiment labels but no theme
// labels, so a supervised model could not be evaluated honestly. Every decision
// here is inspectable (the matched terms are returned with the prediction).
//
// Upgrade path: replace scoreTheme() with weights from a trained multi-label
// classifier once a labelled sample exists. The return shape stays the same,
// so nothing downstream changes.
import { ngrams, tokenize } from './textUtils.js';
import { themes } from '../data/mockThemes.js';

// weight 2 = strongly indicative, 1 = supporting evidence
const SEEDS = {
  'lab-instructions': { lab: 2, labs: 2, 'lab guide': 3, 'lab manual': 3, 'lab report': 2, instructions: 2, practical: 2, experiment: 1, worksheet: 1, 'step by': 1, procedure: 1 },
  'lecture-pace': { pace: 3, paced: 3, fast: 2, 'too fast': 3, slow: 1, 'too slow': 2, rushed: 2, rush: 2, speed: 2, 'keep up': 2, dense: 1, 'cover too': 2, 'too much content': 2 },
  assessment: { exam: 2, exams: 2, midterm: 2, midterms: 2, final: 1, finals: 2, assignment: 2, assignments: 2, quiz: 2, quizzes: 2, grade: 2, grades: 2, grading: 3, graded: 2, marks: 2, marking: 2, rubric: 3, test: 1, tests: 1, curve: 2, weighting: 2, 'marked fairly': 2 },
  'teaching-quality': { prof: 2, professor: 2, lecturer: 2, instructor: 2, teaching: 3, teacher: 2, explains: 3, explain: 2, explanation: 3, explanations: 3, taught: 2, engaging: 2, passionate: 2, knowledgeable: 2, 'goes over': 1 },
  'learning-materials': { slides: 3, notes: 2, 'lecture notes': 3, textbook: 3, book: 1, readings: 2, reading: 1, recordings: 3, recorded: 2, videos: 2, video: 1, materials: 3, resources: 2, handouts: 2, posted: 1 },
  tutorials: { tutorial: 3, tutorials: 3, ta: 2, tas: 2, 'teaching assistant': 3, seminar: 2, 'office hours': 3, 'discussion section': 3, 'lab session': 1 },
  workload: { workload: 3, 'work load': 3, hours: 2, 'time consuming': 3, 'a lot of work': 3, heavy: 2, 'busy work': 3, 'too much work': 3, 'amount of work': 3, tedious: 2, 'every week': 1, deadlines: 2, 'time commitment': 3 },
  'technical-issues': { software: 2, install: 2, installing: 2, crash: 3, crashed: 3, crashes: 3, website: 2, portal: 2, login: 2, 'log in': 2, wifi: 2, zoom: 2, online: 1, platform: 2, error: 2, errors: 2, bug: 2, bugs: 2, version: 1, 'did not work': 2 },
};

const NAME_BY_ID = Object.fromEntries(themes.map((t) => [t.themeId, t.name]));

export function classifyTheme(text) {
  const terms = new Set(ngrams(tokenize(text)));
  const scores = [];

  for (const [themeId, seeds] of Object.entries(SEEDS)) {
    let score = 0;
    const matched = [];
    for (const [seed, weight] of Object.entries(seeds)) {
      if (terms.has(seed)) {
        score += weight;
        matched.push(seed);
      }
    }
    if (score > 0) scores.push({ themeId, score, matched });
  }

  if (!scores.length) {
    return { themeId: null, theme: 'Unclassified', themeConfidence: 0, matched: [] };
  }

  scores.sort((a, b) => b.score - a.score);
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  const best = scores[0];

  return {
    themeId: best.themeId,
    theme: NAME_BY_ID[best.themeId],
    // Share of the evidence pointing at the winning theme: low values mean the
    // comment spans several themes, which the UI surfaces rather than hides.
    themeConfidence: Math.round((best.score / total) * 100) / 100,
    matched: best.matched,
    alternatives: scores.slice(1, 3).map((s) => ({ themeId: s.themeId, theme: NAME_BY_ID[s.themeId], score: s.score })),
  };
}

export const THEME_SEED_COUNT = Object.fromEntries(
  Object.entries(SEEDS).map(([id, seeds]) => [id, Object.keys(seeds).length]),
);
