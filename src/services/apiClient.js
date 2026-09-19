// The single gateway between the UI and the backend.
//
//   VITE_API_MODE=mock → requests are answered by src/mock/mockServer.js
//   VITE_API_MODE=http → requests go to `${VITE_API_BASE_URL}${path}` over fetch
//
// Services build the same paths either way, so swapping in the real API is a
// configuration change. In production the base URL must be HTTPS.
import { config } from '../config.js';
import { getAccessToken } from './session.js';

export class ApiError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let unauthorizedHandler = null;

// AuthContext registers a callback so an expired session signs the user out.
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

function cleanQuery(query = {}) {
  return Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

async function send(method, path, { query, body } = {}) {
  const params = cleanQuery(query);
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let status;
  let data;
  try {
    if (config.apiMode === 'mock') {
      const { handleMockRequest } = await import('../mock/mockServer.js');
      ({ status, data } = await handleMockRequest({ method, path, query: params, headers, body }));
    } else {
      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${config.apiBaseUrl}${path}${qs ? `?${qs}` : ''}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      status = response.status;
      data = response.status === 204 ? null : await response.json().catch(() => null);
    }
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Check your connection and try again.');
  }

  if (status >= 400) {
    if (status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(status, data?.message || 'Request failed.', data || {});
  }
  return data;
}

export const api = {
  get: (path, query) => send('GET', path, { query }),
  post: (path, body) => send('POST', path, { body }),
};
