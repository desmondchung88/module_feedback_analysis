// Central runtime configuration. Everything environment-specific is read here,
// so moving from mock mode to a real backend is a .env change, not a code change.
export const config = {
  apiMode: import.meta.env.VITE_API_MODE || 'mock',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  mockLatencyMs: Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 450),
  isDev: import.meta.env.DEV,
};
