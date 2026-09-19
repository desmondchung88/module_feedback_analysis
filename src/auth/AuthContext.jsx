import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { getCurrentUser, signIn, signOut } from '../services/authService.js';
import { onUnauthorized } from '../services/apiClient.js';
import { AuthContext } from './useAuth.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const navigate = useNavigate();

  const login = useCallback(async (email, password) => {
    const signedIn = await signIn(email, password);
    setUser(signedIn);
    return signedIn;
  }, []);

  const logout = useCallback(() => {
    signOut();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // A 401 from any API call means the session is no longer valid.
  useEffect(() => {
    onUnauthorized(() => {
      signOut();
      setUser(null);
      navigate('/login', { replace: true, state: { expired: true } });
    });
    return () => onUnauthorized(null);
  }, [navigate]);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
