import { api } from './apiClient.js';

// Modules visible to the signed-in user. The server scopes the list by role:
// students get enrolments, lecturers their own modules, admins everything.
export function getModules() {
  return api.get('/api/modules');
}

export function getModule(moduleId) {
  return api.get(`/api/modules/${encodeURIComponent(moduleId)}`);
}

export function getThemes() {
  return api.get('/api/themes');
}
