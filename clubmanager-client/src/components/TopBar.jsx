import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/* Longest prefix first, so /admin/teams wins over any shorter match. */
const TITLES = [
  ['/admin/teams', 'Teams'],
  ['/admin/players', 'Players'],
  ['/admin/matches', 'Matches'],
  ['/admin/users', 'User Accounts'],
  ['/coach/players', 'My Squad'],
  ['/coach/results', 'Fixtures & Results'],
  ['/player/profile', 'My Profile'],
  ['/standings', 'Standings'],
  ['/topscorers', 'Top Scorers'],
];

function titleFor(pathname) {
  const hit = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return hit ? hit[1] : 'ClubManager';
}

export default function TopBar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/standings', { replace: true });
  }

  const initials = (user?.username ?? '??').slice(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <h1 className="topbar-title">{titleFor(pathname)}</h1>

      <div className="user-chip">
        {isAuthenticated ? (
          <>
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="user-name">{user?.username}</span>
            <span className={`badge badge-${(role ?? '').toLowerCase()}`}>{role}</span>
            <button type="button" className="btn-link" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <NavLink to="/login" className="btn-primary">
            Log in
          </NavLink>
        )}
      </div>
    </header>
  );
}
