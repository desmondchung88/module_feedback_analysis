// PLACEHOLDER for the future ML inference service. This is not a model.
//
// In production, a new submission is sent to the classification service
// (TF-IDF + Logistic Regression for sentiment, NMF/KMeans for themes), which
// writes a `feedback_analysis` row. Until then, this stub produces a row in the
// same agreed format from the student's own rating and category choices, so
// new submissions appear on dashboards during demos.
import { themes } from '../data/mockThemes.js';

const KEYWORDS = {
  'Lab Instructions': ['lab', 'instruction', 'guide', 'step'],
  'Lecture Pace': ['pace', 'fast', 'slow', 'rushed', 'lecture'],
  Assessment: ['assignment', 'quiz', 'exam', 'rubric', 'marks', 'grade'],
  'Teaching Quality': ['explain', 'lecturer', 'teaching', 'teacher'],
  'Learning Materials': ['slides', 'notes', 'materials', 'recording', 'textbook'],
  Tutorials: ['tutorial', 'tutor'],
  Workload: ['workload', 'hours', 'too much', 'deadline'],
  'Technical Issues': ['crash', 'login', 'install', 'wifi', 'wi-fi', 'error', 'software', 'portal'],
};

function sentimentFromRating(rating) {
  if (rating == null) return { sentiment: 'neutral', sentimentScore: 0.5 };
  if (rating >= 4) return { sentiment: 'positive', sentimentScore: rating === 5 ? 0.9 : 0.75 };
  if (rating === 3) return { sentiment: 'neutral', sentimentScore: 0.6 };
  return { sentiment: 'negative', sentimentScore: rating === 1 ? 0.9 : 0.75 };
}

function themeFrom(comment, categories) {
  const byCategory = themes.find((t) => categories.includes(t.category));
  if (byCategory) return { theme: byCategory.name, themeConfidence: 0.7 };

  const text = comment.toLowerCase();
  let best = { theme: 'Teaching Quality', hits: 0 };
  for (const [theme, words] of Object.entries(KEYWORDS)) {
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits > best.hits) best = { theme, hits };
  }
  return { theme: best.theme, themeConfidence: best.hits ? 0.55 : 0.3 };
}

export function stubAnalyse({ feedbackId, comment, categories, rating, analysedAt }) {
  return {
    feedbackId,
    ...sentimentFromRating(rating),
    ...themeFrom(comment, categories),
    modelVersion: 'stub-rules-v0',
    analysedAt,
  };
}
