// Where the signed-in session lives in the browser.
// With Cognito this becomes the Amplify/OIDC token store; callers only use
// these three functions, so nothing else needs to change.
const KEY = 'mfi.session';

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function writeSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable: the session lasts for this tab only.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken() {
  return readSession()?.token ?? null;
}
