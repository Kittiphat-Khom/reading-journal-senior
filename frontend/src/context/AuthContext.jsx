import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await getMe();
      setUser(res.data);
    } catch {
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (token, _userData, navigateFn, redirectTo) => {
    localStorage.setItem('token', token);
    await fetchUser();
    if (navigateFn && redirectTo) {
      navigateFn(redirectTo, { replace: true });
    } else if (redirectTo) {
      window.location.replace(redirectTo);
    }
  };

  const logout = (navigateFn) => {
    localStorage.clear();
    setUser(null);
    if (navigateFn) {
      navigateFn('/login', { replace: true });
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
