// In-memory stand-in for the RDS PostgreSQL database.
// Seed tables come from src/data. Rows created during a demo session
// (new submissions) are persisted to localStorage so they survive a reload.
import { users } from '../data/mockUsers.js';
import { themes } from '../data/mockThemes.js';
import { modules, moduleLecturers, moduleStudents, feedbackPeriods, submissionReceipts, TERM } from '../data/mockModules.js';
import { mockFeedback, mockFeedbackAnalysis } from '../data/mockFeedback.js';

const STORAGE_KEY = 'mfi.mockdb.v1';
const emptyDelta = () => ({ feedback: [], feedbackAnalysis: [], submissionReceipts: [] });

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

export const db = {
  term: TERM,
  users,
  themes,
  modules,
  moduleLecturers,
  moduleStudents,
  feedbackPeriods,
  get feedback() { return [...mockFeedback, ...delta.feedback]; },
  get feedbackAnalysis() { return [...mockFeedbackAnalysis, ...delta.feedbackAnalysis]; },
  get submissionReceipts() { return [...submissionReceipts, ...delta.submissionReceipts]; },
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

export function resetMockDb() {
  delta = emptyDelta();
  nextId = mockFeedback.length + 1;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
