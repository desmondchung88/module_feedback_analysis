// Orchestrates the analysis of an uploaded dataset.
//
// Mirrors the four stages taught as the cloud analytics pipeline:
//   capture (parsed rows) -> transform (clean, classify) -> analyse
//   (aggregate, rank) -> interpret (drivers, representatives)
//
// Pure functions with a progress callback: no DOM access, so this module runs
// unchanged in Node, in a Web Worker, or server-side after the backend exists.
import { MIN_RESPONSES } from '../utils/constants.js';
import { driverTerms } from './keywords.js';
import { groupNearDuplicates } from './dedup.js';
import { scrubCorpus } from './scrub.js';
import { rankPriorities } from './priority.js';
import { classifyTheme } from './themeModel.js';
import { getModelInfo, loadSentimentModel, predictSentiment } from './sentimentModel.js';
import { themes } from '../data/mockThemes.js';

const MIN_TEXT_CHARS = 15;
const CHUNK = 400;

const emptyCounts = () => ({ positive: 0, neutral: 0, negative: 0 });

function summarise(records) {
  const counts = emptyCounts();
  for (const r of records) counts[r.sentiment] += 1;
  const total = records.length;
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    total,
    counts,
    pcts: { positive: pct(counts.positive), neutral: pct(counts.neutral), negative: pct(counts.negative) },
  };
}

const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * @param rows     parsed CSV rows (objects keyed by header)
 * @param mapping  { text, group, title, label }
 * @param onProgress ({ stage, done, total, pct }) => void
 */
export async function analyseDataset(rows, mapping, onProgress = () => {}) {
  const report = (stage, done, total) => onProgress({
    stage, done, total, pct: total ? Math.round((done / total) * 100) : 0,
  });

  report('Loading model', 0, 1);
  await loadSentimentModel();
  const model = getModelInfo();

  // ---- Stage 1: clean ----
  const skipped = { empty: 0, tooShort: 0 };
  const cleaned = [];
  rows.forEach((row, i) => {
    const text = String(row[mapping.text] ?? '').trim();
    if (!text) { skipped.empty += 1; return; }
    if (text.length < MIN_TEXT_CHARS) { skipped.tooShort += 1; return; }
    cleaned.push({
      id: `R${i + 1}`,
      text,
      group: String(row[mapping.group] ?? 'Ungrouped').trim() || 'Ungrouped',
      title: mapping.title ? String(row[mapping.title] ?? '').trim() : '',
      providedLabel: mapping.label ? String(row[mapping.label] ?? '').trim() : '',
      week: mapping.week ? String(row[mapping.week] ?? '').trim() : '',
    });
  });

  // ---- Stage 1b: remove identifying text BEFORE anything else reads it ----
  report('Removing names', 0, 1);
  const scrub = scrubCorpus(cleaned.map((c) => c.text));
  cleaned.forEach((c, i) => { c.text = scrub.texts[i]; });
  await sleep();

  // ---- Stage 2: classify (chunked so the UI stays responsive) ----
  const records = [];
  for (let i = 0; i < cleaned.length; i += CHUNK) {
    for (const item of cleaned.slice(i, i + CHUNK)) {
      const s = predictSentiment(item.text);
      const t = classifyTheme(item.text);
      records.push({ ...item, ...s, ...t });
    }
    report('Classifying comments', Math.min(i + CHUNK, cleaned.length), cleaned.length);
    await sleep();
  }

  // ---- Stage 3: aggregate ----
  report('Finding duplicates', 0, 1);
  const dedupe = groupNearDuplicates(records.map((r) => ({ id: r.id, text: r.text })));
  const duplicateIds = new Set();
  for (const g of dedupe.groups) for (const m of g.members.slice(1)) duplicateIds.add(m.id);
  await sleep();

  report('Building insights', 0, 1);
  const overall = summarise(records);
  const corpusNegativeShare = records.length ? overall.counts.negative / records.length : 0;
  const allText = records.map((r) => r.text);

  const themeStats = themes.map((theme) => {
    const inTheme = records.filter((r) => r.themeId === theme.themeId);
    const s = summarise(inTheme);
    const distinct = inTheme.filter((r) => !duplicateIds.has(r.id)).length;
    const negatives = inTheme.filter((r) => r.sentiment === 'negative');
    return {
      themeId: theme.themeId,
      name: theme.name,
      count: inTheme.length,
      distinctCount: distinct,
      counts: s.counts,
      pcts: s.pcts,
      suppressed: inTheme.length < MIN_RESPONSES,
      // What makes the NEGATIVE comments in this theme distinctive.
      drivers: inTheme.length >= MIN_RESPONSES
        ? driverTerms(negatives.map((r) => r.text), allText, { limit: 6 })
        : [],
      examples: negatives
        .sort((a, b) => b.sentimentScore - a.sentimentScore)
        .slice(0, 3)
        .map((r) => ({ id: r.id, text: r.text, sentimentScore: r.sentimentScore, group: r.group })),
    };
  }).filter((t) => t.count > 0).sort((a, b) => b.count - a.count);

  const unclassifiedRecords = records.filter((r) => !r.themeId);
  const unclassified = unclassifiedRecords.length;
  if (unclassified) {
    // Reported openly rather than dropped: a third of comments matching no
    // theme is itself a finding about the seed vocabulary.
    const s = summarise(unclassifiedRecords);
    themeStats.push({
      themeId: null,
      name: 'Unclassified',
      count: unclassified,
      distinctCount: unclassifiedRecords.filter((r) => !duplicateIds.has(r.id)).length,
      counts: s.counts,
      pcts: s.pcts,
      suppressed: unclassified < MIN_RESPONSES,
      drivers: driverTerms(unclassifiedRecords.map((r) => r.text), allText, { limit: 6 }),
      examples: [],
    });
  }

  const byGroup = new Map();
  for (const r of records) {
    if (!byGroup.has(r.group)) byGroup.set(r.group, []);
    byGroup.get(r.group).push(r);
  }
  const groups = [...byGroup.entries()]
    .map(([group, items]) => {
      const s = summarise(items);
      const topTheme = themes
        .map((t) => ({ name: t.name, n: items.filter((i) => i.themeId === t.themeId).length }))
        .sort((a, b) => b.n - a.n)[0];
      return {
        group,
        title: items.find((i) => i.title)?.title ?? '',
        count: items.length,
        counts: s.counts,
        pcts: s.pcts,
        suppressed: items.length < MIN_RESPONSES,
        topTheme: topTheme?.n ? topTheme.name : null,
      };
    })
    .sort((a, b) => b.count - a.count);

  // ---- Optional: agreement with a label column, when the CSV has one ----
  let labelAgreement = null;
  if (mapping.label) {
    const labelled = records.filter((r) => r.providedLabel && r.sentiment !== 'neutral');
    if (labelled.length >= 20) {
      const positiveWords = /like|positive|good|1|true|yes/i;
      let agree = 0;
      for (const r of labelled) {
        const providedPositive = positiveWords.test(r.providedLabel) && !/dislike|not /i.test(r.providedLabel);
        if (providedPositive === (r.sentiment === 'positive')) agree += 1;
      }
      labelAgreement = {
        compared: labelled.length,
        agreementPct: Math.round((agree / labelled.length) * 1000) / 10,
        note: 'Agreement with the label column supplied in the CSV, excluding comments the model reported as neutral. The supplied label describes overall course rating, so disagreement is expected where a comment criticises one aspect of a course the student otherwise liked.',
      };
    }
  }

  report('Done', 1, 1);

  return {
    model,
    privacy: scrub.stats,
    summary: {
      rowsInFile: rows.length,
      analysed: records.length,
      skipped,
      distinctIssues: dedupe.distinctCount,
      duplicateComments: dedupe.duplicateCount,
      unclassified,
      groups: groups.length,
      sentiment: overall,
    },
    groups,
    themes: themeStats,
    priorities: rankPriorities(themeStats, { corpusNegativeShare }),
    duplicates: dedupe.groups.slice(0, 10),
    labelAgreement,
    records,
  };
}
