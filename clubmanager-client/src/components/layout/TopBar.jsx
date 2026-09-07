import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

/* Longest prefix first, so /admin/teams wins over /admin. */
const TITLES = [
  ['/admin/teams', 'Teams', 'Manage'],
  ['/admin/players', 'Players', 'Manage'],
  ['/admin/matches', 'Matches', 'Manage'],
  ['/admin/users', 'User Accounts', 'Manage'],
  ['/admin', 'Dashboard', 'Admin'],
  ['/coach/players', 'My Squad', 'My Team'],
  ['/coach/results', 'Fixtures & Results', 'My Team'],
  ['/coach', 'Dashboard', 'Coach'],
  ['/player/profile', 'My Profile', 'My Club'],
  ['/standings', 'Standings', 'Competition'],
  ['/topscorers', 'Top Scorers', 'Competition'],
];

function titleFor(pathname) {
  const hit = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return hit ? { title: hit[1], crumb: hit[2] } : { title: 'ClubManager', crumb: null };
}

export default function TopBar({ onToggleNav, navOpen }) {
  const { isAuthenticated, user, role, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { title, crumb } = titleFor(pathname);

  function handleLogout() {
    logout();
    navigate('/standings', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-lead">
        <button
          type="button"
          className="nav-toggle"
          onClick={onToggleNav}
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
        >
          <span aria-hidden="true">{navOpen ? '✕' : '☰'}</span>
        </button>

        <div className="topbar-titles">
          {crumb && <div className="topbar-crumb">{crumb}</div>}
          <h1 className="topbar-title">{title}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        {isAuthenticated ? (
          <>
            <span className="user-chip">
              <span className="avatar" aria-hidden="true">
                {(user?.username ?? '??').slice(0, 2).toUpperCase()}
              </span>
              <span className="user-name">{user?.username}</span>
              <span className={`badge badge-${(role ?? '').toLowerCase()}`}>{role}</span>
            </span>
            <button type="button" className="btn-link" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <NavLink to="/login" className="btn-primary btn-small">
            Log in
          </NavLink>
        )}
      </div>
    </header>
  );
}
