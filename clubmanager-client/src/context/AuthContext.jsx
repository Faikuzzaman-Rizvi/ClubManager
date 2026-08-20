import { useCallback, useMemo, useState } from 'react';
import axiosClient, { TOKEN_KEY, USER_KEY } from '../api/axiosClient';
import { AuthContext } from './authContextObject';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupt entry - treat it as signed out rather than crashing the app.
    return null;
  }
}

export function AuthProvider({ children }) {
  // Seeded straight from localStorage so a refresh does not sign the user out.
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback(async (username, password) => {
    const { data } = await axiosClient.post('/api/auth/login', { username, password });

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
