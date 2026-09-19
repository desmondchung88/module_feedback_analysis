// Builds the mock `feedback` and `feedback_analysis` tables.
//
// `feedback` holds what the student submitted. `feedback_analysis` holds what
// the (future) ML service returns for each comment, in the agreed output format:
//   { feedbackId, sentiment, sentimentScore, theme, themeConfidence }
// Keeping them separate means the real model can later write its own rows
// without touching submitted feedback or the UI.
//
// Generation is deterministic: exact comment counts per theme, spread across
// weeks and sentiments so each scenario below reliably shows up in the UI.
import { commentBank } from './commentBank.js';
import { modules, feedbackPeriods, TERM } from './mockModules.js';
import { themeById } from './mockThemes.js';
import { createRandom } from '../utils/random.js';

const mix = (positive, neutral, negative) => ({ positive, neutral, negative });
const shift = (fromWeek, before, after) => (week) => (week < fromWeek ? before : after);
const steady = (weights) => () => weights;

// Per-module scenario: comments per theme, and how sentiment on each theme
// evolves by teaching week. Themes with fewer than 5 comments are deliberately
// included to show the per-theme privacy threshold.
const profiles = {
  INF2003: {
    'lab-instructions': [24, shift(3, mix(62, 28, 10), mix(8, 16, 76))], // increasing from Week 3
    'teaching-quality': [14, shift(5, mix(30, 10, 60), mix(90, 6, 4))], // improving
    'lecture-pace': [10, steady(mix(25, 23, 52))], // stable
    assessment: [8, shift(5, mix(55, 25, 20), mix(10, 15, 75))], // increasing
    'technical-issues': [6, steady(mix(22, 21, 57))],
    'learning-materials': [5, steady(mix(58, 16, 26))],
    tutorials: [3, steady(mix(60, 25, 15))], // below threshold
  },
  INF2001: {
    workload: [11, shift(6, mix(50, 30, 20), mix(5, 15, 80))], // project crunch
    assessment: [9, steady(mix(40, 30, 30))],
    'teaching-quality': [9, steady(mix(78, 12, 10))],
    tutorials: [7, steady(mix(70, 20, 10))],
    'learning-materials': [6, steady(mix(55, 25, 20))],
    'lab-instructions': [3, steady(mix(45, 30, 25))], // below threshold
  },
  BAC2005: {
    'lecture-pace': [9, steady(mix(20, 22, 58))],
    'learning-materials': [7, steady(mix(70, 18, 12))],
    'teaching-quality': [5, steady(mix(60, 20, 20))],
    tutorials: [4, steady(mix(65, 20, 15))], // below threshold
  },
  INF2006: {
    'technical-issues': [10, shift(4, mix(55, 30, 15), mix(5, 15, 80))], // lab credits running out
    'lab-instructions': [6, steady(mix(40, 30, 30))],
    'teaching-quality': [6, steady(mix(75, 15, 10))],
  },
  INF2002: {
    'teaching-quality': [6, steady(mix(80, 15, 5))],
    tutorials: [6, steady(mix(75, 20, 5))],
  },
  MAT1001: {
    assessment: [5, steady(mix(15, 25, 60))],
    'lecture-pace': [5, steady(mix(20, 20, 60))],
  },
  // Only 3 responses: the whole module is below the privacy threshold.
  CSC3005: {
    'teaching-quality': [2, steady(mix(70, 20, 10))],
    'lab-instructions': [1, steady(mix(30, 30, 40))],
  },
  // No responses yet: demonstrates the empty state.
  ENG2002: {},
};

// Later weeks get slightly more feedback, as students engage more mid-term.
const WEEK_WEIGHTS = { 1: 8, 2: 10, 3: 12, 4: 13, 5: 13, 6: 14, 7: 15, 8: 15 };
const RATING_BY_SENTIMENT = { positive: [4, 5, 5], neutral: [3, 3, 4, 2], negative: [1, 2, 2] };
const DAY_MS = 24 * 60 * 60 * 1000;

// Largest-remainder split of `total` across weighted keys.
function allocate(total, weights) {
  const entries = Object.entries(weights);
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  const rows = entries.map(([key, w]) => {
    const exact = (total * w) / sum;
    return { key, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = total - rows.reduce((s, r) => s + r.count, 0);
  [...rows].sort((a, b) => b.remainder - a.remainder).forEach((row) => {
    if (left > 0) {
      row.count += 1;
      left -= 1;
    }
  });
  return rows.flatMap((row) => Array(row.count).fill(Number(row.key)));
}

// Error diffusion: walks the weeks in order and emits the sentiment that is
// most "owed", so the realised mix tracks the target mix even for small counts.
function sentimentSequence(weeks, mixForWeek) {
  const owed = { positive: 0, neutral: 0, negative: 0 };
  return weeks.map((week) => {
    const target = mixForWeek(week);
    const total = target.positive + target.neutral + target.negative;
    for (const s of Object.keys(owed)) owed[s] += target[s] / total;
    const chosen = Object.keys(owed).reduce((a, b) => (owed[b] > owed[a] ? b : a));
    owed[chosen] -= 1;
    return chosen;
  });
}

function submittedAtFor(rand, week) {
  const start = new Date(`${TERM.startDate}T00:00:00+08:00`).getTime();
  // The current week is only partly over: keep dates on or before its Thursday.
  const maxDay = week === TERM.currentWeek ? 3 : 6;
  const dayOffset = (week - 1) * 7 + rand.int(0, maxDay);
  const minutes = rand.int(8 * 60, 23 * 60);
  return new Date(start + dayOffset * DAY_MS + minutes * 60 * 1000).toISOString();
}

// Prefers sentences not yet used in this module, so comments rarely repeat.
function pickComment(rand, themeId, sentiment, topics, used) {
  const templates = commentBank[themeId][sentiment];
  const unusedTemplates = templates.filter((t) => t.includes('{topic}') || !used.has(t));
  const template = rand.pick(unusedTemplates.length ? unusedTemplates : templates);
  const variants = template.includes('{topic}') ? topics.map((topic) => template.replace('{topic}', topic)) : [template];
  const fresh = variants.filter((v) => !used.has(v));
  const text = rand.pick(fresh.length ? fresh : variants);
  used.add(text);
  return text;
}

const round2 = (value) => Math.round(value * 100) / 100;

function generate() {
  const rand = createRandom(20260918);
  const drafts = [];

  for (const module of modules) {
    const period = feedbackPeriods.find((p) => p.moduleId === module.moduleId);
    const used = new Set();

    for (const [themeId, [count, mixForWeek]] of Object.entries(profiles[module.moduleId])) {
      const theme = themeById[themeId];
      const weeks = allocate(count, WEEK_WEIGHTS);
      const sentiments = sentimentSequence(weeks, mixForWeek);

      weeks.forEach((week, i) => {
        const sentiment = sentiments[i];
        const categories = rand.next() < 0.7 ? [theme.category] : [];
        if (categories.length && rand.next() < 0.25) {
          const extra = rand.pick(['Lecture', 'Tutorial', 'Lab', 'Workload']);
          if (!categories.includes(extra)) categories.push(extra);
        }
        drafts.push({
          moduleId: module.moduleId,
          periodId: period.periodId,
          week,
          comment: pickComment(rand, themeId, sentiment, module.topics, used),
          rating: rand.next() < 0.75 ? rand.pick(RATING_BY_SENTIMENT[sentiment]) : null,
          categories,
          submittedAt: submittedAtFor(rand, week),
          sentiment,
          theme: theme.name,
          sentimentScore: round2(0.55 + rand.next() * 0.43),
          themeConfidence: round2(0.5 + rand.next() * 0.45),
        });
      });
    }
  }

  // IDs follow submission order, as a database sequence would.
  drafts.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const feedback = [];
  const feedbackAnalysis = [];
  drafts.forEach((d, i) => {
    const feedbackId = `FB${String(i + 1).padStart(4, '0')}`;
    feedback.push({
      feedbackId,
      moduleId: d.moduleId,
      periodId: d.periodId,
      week: d.week,
      comment: d.comment,
      rating: d.rating,
      categories: d.categories,
      submittedAt: d.submittedAt,
    });
    feedbackAnalysis.push({
      feedbackId,
      sentiment: d.sentiment,
      sentimentScore: d.sentimentScore,
      theme: d.theme,
      themeConfidence: d.themeConfidence,
      modelVersion: 'mock-seed-v1',
      analysedAt: new Date(new Date(d.submittedAt).getTime() + 5 * 60 * 1000).toISOString(),
    });
  });

  return { feedback, feedbackAnalysis };
}

export const { feedback: mockFeedback, feedbackAnalysis: mockFeedbackAnalysis } = generate();
