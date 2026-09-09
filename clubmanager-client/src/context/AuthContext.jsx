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

  /*
   * Keeps the signed-in user in step after they change their own avatar, so the
   * TopBar updates without a reload. Stored as well as held in state, or a
   * refresh would show the old picture again.
   */
  const updateAvatar = useCallback((avatarUrl, hasOwnAvatar) => {
    setUser((current) => {
      if (!current) return current;

      const next = { ...current, avatarUrl, hasOwnAvatar };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((current) => {
      if (!current) return current;

      const next = { ...current, ...userData };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
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
      updateAvatar,
      updateUser,
    }),
    [token, user, login, logout, updateAvatar, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
