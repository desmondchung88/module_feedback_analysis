// In-memory stand-in for the RDS PostgreSQL database.
//
// Three layers, combined on read:
//   SEED     the synthetic demo dataset in src/data. OFF by default so the app
//            starts empty and real imported data is not mixed with fake data.
//            Re-enable from the account menu (Developer tools) for demos.
//   IMPORTED a dataset loaded from a CSV via Import & Analyse. Session-only:
//            too large for localStorage, so it clears on reload.
//   DELTA    feedback submitted during this session. Persisted to localStorage.
import { users } from '../data/mockUsers.js';
import { themes } from '../data/mockThemes.js';
import { modules, moduleLecturers, moduleStudents, feedbackPeriods, submissionReceipts, TERM } from '../data/mockModules.js';
import { mockFeedback, mockFeedbackAnalysis } from '../data/mockFeedback.js';

const STORAGE_KEY = 'mfi.mockdb.v1';
const SEED_KEY = 'mfi.seedData';

const emptyDelta = () => ({ feedback: [], feedbackAnalysis: [], submissionReceipts: [] });
const emptyImport = () => ({
  meta: null, modules: [], moduleLecturers: [], feedbackPeriods: [], feedback: [], feedbackAnalysis: [],
});

// ---------- seed toggle ----------
// Default OFF: an empty app is the honest starting point for real data.
export function isSeedEnabled() {
  try {
    return localStorage.getItem(SEED_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSeedEnabled(on) {
  try {
    localStorage.setItem(SEED_KEY, on ? 'on' : 'off');
  } catch {
    // ignore
  }
}

const seed = () => (isSeedEnabled()
  ? { modules, moduleLecturers, moduleStudents, feedbackPeriods, feedback: mockFeedback, feedbackAnalysis: mockFeedbackAnalysis, receipts: submissionReceipts }
  : { modules: [], moduleLecturers: [], moduleStudents: [], feedbackPeriods: [], feedback: [], feedbackAnalysis: [], receipts: [] });

// ---------- session storage ----------
function readDelta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && Array.isArray(parsed.feedback) ? parsed : emptyDelta();
  } catch {
    return emptyDelta();
  }
}

function writeDelta(delta) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(delta));
  } catch {
    // Storage unavailable (private mode): the session still works in memory.
  }
}

let delta = readDelta();
let imported = emptyImport();

export const db = {
  term: TERM,
  users,
  themes,
  get modules() { return [...seed().modules, ...imported.modules]; },
  get moduleLecturers() { return [...seed().moduleLecturers, ...imported.moduleLecturers]; },
  get moduleStudents() { return seed().moduleStudents; },
  get feedbackPeriods() { return [...seed().feedbackPeriods, ...imported.feedbackPeriods]; },
  get feedback() { return [...seed().feedback, ...imported.feedback, ...delta.feedback]; },
  get feedbackAnalysis() { return [...seed().feedbackAnalysis, ...imported.feedbackAnalysis, ...delta.feedbackAnalysis]; },
  get submissionReceipts() { return [...seed().receipts, ...delta.submissionReceipts]; },
  get importMeta() { return imported.meta; },
};

let nextId = mockFeedback.length + delta.feedback.length + 1;

export function nextFeedbackId() {
  const id = `FB${String(nextId).padStart(4, '0')}`;
  nextId += 1;
  return id;
}

// Equivalent of one database transaction: feedback, its analysis and the
// anonymous receipt are written together.
export function insertSubmission({ feedback, analysis, receipt }) {
  delta = {
    feedback: [...delta.feedback, feedback],
    feedbackAnalysis: [...delta.feedbackAnalysis, analysis],
    submissionReceipts: [...delta.submissionReceipts, receipt],
  };
  writeDelta(delta);
}

// Replaces any previously imported dataset. Not persisted: a real import is
// far larger than the localStorage quota, so it lives for this session only.
export function setImportedDataset(dataset) {
  imported = { ...emptyImport(), ...dataset };
}

export function clearImportedDataset() {
  imported = emptyImport();
}

export function resetMockDb() {
  delta = emptyDelta();
  imported = emptyImport();
  nextId = mockFeedback.length + 1;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
