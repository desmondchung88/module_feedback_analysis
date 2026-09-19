// Authentication boundary.
//
// Mock mode: POST /api/auth/login returns a fake token.
// Cognito later: replace the bodies of signIn/signOut/getCurrentUser with the
// Amplify Auth (or hosted-UI OIDC) equivalents and keep the same return shape
// { user: { userId, name, email, role } }. The role would come from a Cognito
// group claim. No component imports anything else about auth.
import { api } from './apiClient.js';
import { clearSession, readSession, writeSession } from './session.js';

export async function signIn(email, password) {
  const { token, user } = await api.post('/api/auth/login', { email, password });
  writeSession({ token, user });
  return user;
}

export function signOut() {
  clearSession();
}

export function getCurrentUser() {
  return readSession()?.user ?? null;
}
