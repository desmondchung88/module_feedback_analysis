// SERVER-SIDE authorisation and privacy rules.
//
// These run inside the mock server, i.e. on the "backend" side of the API
// boundary. When the real backend is built, these exact rules move into it
// (e.g. as middleware plus row-level checks in SQL). The React UI never relies
// on them for security; it only reacts to the 401/403 responses they produce.
import { MIN_RESPONSES } from '../utils/constants.js';
import { db } from './db.js';

export function isLecturerOf(userId, moduleId) {
  return db.moduleLecturers.some((row) => row.userId === userId && row.moduleId === moduleId);
}

export function isEnrolledIn(userId, moduleId) {
  return db.moduleStudents.some((row) => row.userId === userId && row.moduleId === moduleId);
}

// Module metadata (code, name, lecturer): students see modules they take,
// lecturers the modules they teach, admins everything.
export function canViewModule(user, moduleId) {
  if (user.role === 'admin') return true;
  if (user.role === 'lecturer') return isLecturerOf(user.userId, moduleId);
  if (user.role === 'student') return isEnrolledIn(user.userId, moduleId);
  return false;
}

// Feedback content and analytics: only the module's own lecturers.
// Admins are deliberately excluded (least privilege): they see participation
// counts, not what students wrote.
export function canViewFeedback(user, moduleId) {
  return user.role === 'lecturer' && isLecturerOf(user.userId, moduleId);
}

export function canSubmitFeedback(user, moduleId) {
  return user.role === 'student' && isEnrolledIn(user.userId, moduleId);
}

export function meetsPrivacyThreshold(count) {
  return count >= MIN_RESPONSES;
}

export function lecturerModuleIds(userId) {
  return db.moduleLecturers.filter((row) => row.userId === userId).map((row) => row.moduleId);
}
