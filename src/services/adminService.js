import { api } from './apiClient.js';

export function getAdminOverview() {
  return api.get('/api/admin/overview');
}
