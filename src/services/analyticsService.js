// Analytics are computed server-side from ML classification results.
// The UI only renders what these endpoints return, so swapping the mock
// analysis for the real TF-IDF/LogReg + NMF/KMeans pipeline needs no UI change.
import { api } from './apiClient.js';

export function getModuleAnalytics(moduleId, { week, theme, sentiment } = {}) {
  return api.get(`/api/modules/${encodeURIComponent(moduleId)}/analytics`, { week, theme, sentiment });
}

export function getThemeDetail(moduleId, themeId) {
  return api.get(`/api/modules/${encodeURIComponent(moduleId)}/themes/${encodeURIComponent(themeId)}`);
}
