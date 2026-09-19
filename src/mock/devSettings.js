// Development-only switches for exercising loading and error states.
const KEY = 'mfi.dev';

export function getDevSettings() {
  try {
    return { simulateErrors: false, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { simulateErrors: false };
  }
}

export function setDevSettings(patch) {
  const next = { ...getDevSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
