import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { homePathForRole } from '../routes/roleHome';

export default function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedIn = await login(username.trim(), password);
      // Back to whatever ProtectedRoute bounced them off, else their role home.
      navigate(location.state?.from ?? homePathForRole(signedIn.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ??
          'Could not sign in. Check the username and password and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-brand">
        <span className="brand-ball" aria-hidden="true" />
        ClubManager
      </div>

      <div className="auth-card">
        <h1>Sign in</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="hint">
        Standings and top scorers are public - you do not need an account to view them.
      </p>
      </div>
    </div>
  );
}
