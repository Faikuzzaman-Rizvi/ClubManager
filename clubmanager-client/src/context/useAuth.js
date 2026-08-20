import { useContext } from 'react';
import { AuthContext } from './authContextObject';

/** Reads the auth state provided by AuthProvider. */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
