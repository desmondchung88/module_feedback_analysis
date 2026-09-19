import { api } from './apiClient.js';

export function submitFeedback({ moduleId, comment, categories, rating }) {
  return api.post('/api/feedback', { moduleId, comment, categories, rating });
}

// Lecturer feedback browser. Filters: module, theme, sentiment, week, q, page.
export function searchFeedback(filters = {}) {
  const { module, ...rest } = filters;
  return module
    ? api.get(`/api/modules/${encodeURIComponent(module)}/feedback`, rest)
    : api.get('/api/feedback', rest);
}
