// Aggregations behind GET /api/modules/:id/analytics and the theme detail API.
// Pure functions over joined rows: they port directly to the backend (or to SQL).
import { MIN_RESPONSES, SENTIMENTS, TOTAL_WEEKS } from '../utils/constants.js';

// feedback ⨝ feedback_analysis ⨝ themes → one item per analysed comment.
export function joinFeedback(feedback, analysis, themes) {
  const analysisById = new Map(analysis.map((a) => [a.feedbackId, a]));
  const themeByName = new Map(themes.map((t) => [t.name, t]));
  return feedback
    .filter((f) => analysisById.has(f.feedbackId))
    .map((f) => {
      const a = analysisById.get(f.feedbackId);
      const theme = themeByName.get(a.theme);
      return {
        feedbackId: f.feedbackId,
        moduleId: f.moduleId,
        week: f.week,
        comment: f.comment,
        submittedAt: f.submittedAt,
        sentiment: a.sentiment,
        sentimentScore: a.sentimentScore,
        theme: a.theme,
        themeId: theme ? theme.themeId : null,
        themeConfidence: a.themeConfidence,
      };
    });
}

export function applyFilters(items, { week, themeId, sentiment, q } = {}) {
  const needle = q ? q.trim().toLowerCase() : '';
  return items.filter((item) =>
    (!week || item.week === Number(week))
    && (!themeId || item.themeId === themeId)
    && (!sentiment || item.sentiment === sentiment)
    && (!needle || item.comment.toLowerCase().includes(needle)));
}

export function sentimentSummary(items) {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const item of items) counts[item.sentiment] += 1;
  const total = items.length;
  const pcts = Object.fromEntries(SENTIMENTS.map((s) => [s, total ? (counts[s] / total) * 100 : 0]));
  return { total, counts, pcts };
}

// One point per teaching week. Weeks after the current week are null, so
// lines stop at "today" instead of dropping to zero.
export function weeklySeries(items, currentWeek) {
  return Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const week = i + 1;
    if (week > currentWeek) return { week, label: `W${week}`, positive: null, neutral: null, negative: null, total: null };
    const inWeek = items.filter((item) => item.week === week);
    const { counts } = sentimentSummary(inWeek);
    return { week, label: `W${week}`, ...counts, total: inWeek.length };
  });
}

const negativeShare = (list) => list.filter((i) => i.sentiment === 'negative').length / list.length;

// Finds the week where negative sentiment changed most, and keeps the change
// only if it is large and unlikely to be noise (two-proportion z-test).
export function detectTrend(items) {
  const MIN_SIDE = 3;
  const MIN_CHANGE = 0.2;
  const MIN_Z = 2;
  const maxWeek = Math.max(0, ...items.map((i) => i.week));
  let best = null;

  for (let week = 2; week <= maxWeek; week += 1) {
    const before = items.filter((i) => i.week < week);
    const after = items.filter((i) => i.week >= week);
    if (before.length < MIN_SIDE || after.length < MIN_SIDE) continue;

    const diff = negativeShare(after) - negativeShare(before);
    const pooled = negativeShare(items);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / before.length + 1 / after.length));
    const z = se > 0 ? diff / se : 0;
    if (!best || Math.abs(z) > Math.abs(best.z)) best = { week, diff, z };
  }

  if (!best || Math.abs(best.diff) < MIN_CHANGE || Math.abs(best.z) < MIN_Z) {
    return { direction: 'stable', sinceWeek: null, description: 'No significant change in sentiment' };
  }
  return best.diff > 0
    ? { direction: 'increasing', sinceWeek: best.week, description: `Negative sentiment increasing since Week ${best.week}` }
    : { direction: 'improving', sinceWeek: best.week, description: `Negative sentiment decreasing since Week ${best.week}` };
}

// Per-theme rows for the theme table. Themes below the privacy threshold keep
// their count but lose every breakdown.
export function themeBreakdown(items, themes, { trendItems = items, withTrend = true } = {}) {
  return themes
    .map((theme) => {
      const inTheme = items.filter((i) => i.themeId === theme.themeId);
      const totalForTheme = trendItems.filter((i) => i.themeId === theme.themeId);
      const suppressed = totalForTheme.length < MIN_RESPONSES;
      const { counts, pcts } = sentimentSummary(inTheme);
      return {
        themeId: theme.themeId,
        name: theme.name,
        count: inTheme.length,
        suppressed,
        counts: suppressed ? null : counts,
        pcts: suppressed ? null : pcts,
        trend: suppressed || !withTrend ? null : detectTrend(totalForTheme),
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

// Picks comments to represent a set: seats are shared out in proportion to
// sentiment, and within each sentiment the most confidently classified win.
export function representativeComments(items, limit = 6) {
  if (!items.length) return [];
  const { counts, total } = sentimentSummary(items);
  const seats = Object.fromEntries(SENTIMENTS.map((s) => [s, counts[s] ? Math.max(1, Math.round((counts[s] / total) * limit)) : 0]));
  const picked = [];
  for (const s of SENTIMENTS) {
    const group = items
      .filter((i) => i.sentiment === s)
      .sort((a, b) => b.sentimentScore * b.themeConfidence - a.sentimentScore * a.themeConfidence);
    picked.push(...group.slice(0, seats[s]));
  }
  return picked.slice(0, limit).sort((a, b) => b.week - a.week);
}

// Lecturer-facing view of a comment. Exact timestamps are dropped: a precise
// time could be matched against who was online, so only the week is shown.
export function toPublicComment(item) {
  const { submittedAt: _dropped, ...rest } = item;
  return rest;
}

export function latestDate(items) {
  if (!items.length) return null;
  return items.reduce((latest, i) => (i.submittedAt > latest ? i.submittedAt : latest), items[0].submittedAt);
}
