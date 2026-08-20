import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/**
 * Gates a route on being signed in, and optionally on holding one of `roles`.
 * This is a convenience guard, not a security boundary - the API enforces the
 * same rules on every request.
 */
export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(role)) {
    return (
      <div className="card">
        <h2>Not authorised</h2>
        <p>
          This page is for {roles.join(' or ')}. You are signed in as <strong>{role}</strong>.
        </p>
      </div>
    );
  }

  return children;
}
