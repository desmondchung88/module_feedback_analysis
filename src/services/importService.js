// Dataset import and analysis.
//
// Today the analysis runs in the browser so the prototype works without a
// backend. The boundary is deliberately the same shape as the future API:
//
//   POST /api/datasets            multipart upload + column mapping
//   GET  /api/datasets/:id/insights
//
// When the backend exists, replace the body of analyseCsvFile() with those two
// calls. src/analysis/* is dependency-free and moves to the server unchanged,
// so predictions and aggregates stay identical wherever they run.
import { analyseDataset } from '../analysis/pipeline.js';
import { parseCsv, suggestMapping } from '../utils/csv.js';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_ROWS = 20000;

export class ImportError extends Error {}

function readFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ImportError('The file could not be read.'));
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress({ stage: 'Reading file', done: e.loaded, total: e.total, pct: Math.round((e.loaded / e.total) * 100) });
    };
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file);
  });
}

// Validation mirrors what the server must re-check on upload.
export function validateFile(file) {
  if (!file) return 'Choose a CSV file to analyse.';
  if (!/\.csv$/i.test(file.name)) return 'Only .csv files are supported.';
  if (file.size > MAX_FILE_BYTES) return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  if (file.size === 0) return 'That file is empty.';
  return null;
}

export async function inspectCsvFile(file, onProgress = () => {}) {
  const error = validateFile(file);
  if (error) throw new ImportError(error);

  const text = await readFile(file, onProgress);
  const { headers, rows, truncated } = parseCsv(text, { maxRows: MAX_ROWS });
  if (!headers.length) throw new ImportError('No columns found. Is this a CSV file?');
  if (!rows.length) throw new ImportError('The file has a header row but no data.');

  return {
    fileName: file.name,
    fileSize: file.size,
    headers,
    rows,
    truncated,
    mapping: suggestMapping(headers),
    preview: rows.slice(0, 5),
  };
}

export async function analyseCsvFile(inspection, mapping, onProgress = () => {}) {
  if (!mapping.text) throw new ImportError('Select which column holds the comment text.');
  const result = await analyseDataset(inspection.rows, mapping, onProgress);
  return {
    ...result,
    source: {
      fileName: inspection.fileName,
      fileSize: inspection.fileSize,
      truncated: inspection.truncated,
      mapping,
      analysedAt: new Date().toISOString(),
    },
  };
}

// Evidence export: everything except the comment texts, so the artefact can be
// committed to the repository without carrying the corpus with it.
export function buildExport(result) {
  return {
    source: result.source,
    model: result.model,
    privacy: { ...result.privacy, maskedTerms: undefined },
    summary: result.summary,
    labelAgreement: result.labelAgreement,
    themes: result.themes.map(({ examples, ...rest }) => rest),
    priorities: result.priorities,
    groups: result.groups.slice(0, 50),
    duplicateClusters: result.duplicates.map((d) => ({ size: d.size })),
  };
}

// ---------------------------------------------------------------------------
// Loading an analysed dataset into the dashboards.
//
// Converts the analysis output into the same table shapes the rest of the app
// reads (modules / module_lecturers / feedback / feedback_analysis), so every
// existing screen works against imported data with no changes. In production
// this is what the ingestion endpoint would INSERT.
// ---------------------------------------------------------------------------
export const MAX_IMPORTED_MODULES = 60;

const slug = (value) => String(value).trim().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toUpperCase() || 'UNGROUPED';

export function buildImportedDataset(result, user) {
  const byGroup = new Map();
  for (const r of result.records) {
    if (!byGroup.has(r.group)) byGroup.set(r.group, []);
    byGroup.get(r.group).push(r);
  }

  // Largest groups first: a file with 2,000 courses would be unusable as
  // 2,000 dashboard cards, so the long tail is reported but not loaded.
  const ordered = [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length);
  const selected = ordered.slice(0, MAX_IMPORTED_MODULES);
  const omitted = ordered.length - selected.length;

  const modules = [];
  const moduleLecturers = [];
  const feedbackPeriods = [];
  const feedback = [];
  const feedbackAnalysis = [];
  const analysedAt = result.source.analysedAt;
  let hasWeeks = false;

  selected.forEach(([group, records]) => {
    const moduleId = slug(group);
    const title = records.find((r) => r.title)?.title || group;
    modules.push({
      moduleId,
      code: group,
      name: title,
      semester: `Imported · ${result.source.fileName}`,
      enrolmentCount: 0,
      topics: [],
    });
    moduleLecturers.push({ moduleId, userId: user.userId });
    feedbackPeriods.push({
      periodId: `FP-${moduleId}`,
      moduleId,
      name: 'Imported dataset',
      opensAt: '1970-01-01',
      closesAt: analysedAt.slice(0, 10),
      status: 'closed', // historical data: not open for new submissions
    });

    records.forEach((r) => {
      const week = Number.isFinite(Number(r.week)) && r.week !== '' ? Number(r.week) : null;
      if (week) hasWeeks = true;
      feedback.push({
        feedbackId: r.id,
        moduleId,
        periodId: `FP-${moduleId}`,
        week,
        comment: r.text,
        rating: null,
        categories: [],
        submittedAt: analysedAt,
      });
      feedbackAnalysis.push({
        feedbackId: r.id,
        sentiment: r.sentiment,
        sentimentScore: r.sentimentScore,
        theme: r.theme,
        themeConfidence: r.themeConfidence,
        modelVersion: `${result.model.name}@${result.model.version}`,
        analysedAt,
      });
    });
  });

  return {
    meta: {
      fileName: result.source.fileName,
      analysedAt,
      modulesLoaded: modules.length,
      modulesOmitted: omitted,
      comments: feedback.length,
      hasWeeks,
      model: result.model,
    },
    modules,
    moduleLecturers,
    feedbackPeriods,
    feedback,
    feedbackAnalysis,
  };
}
