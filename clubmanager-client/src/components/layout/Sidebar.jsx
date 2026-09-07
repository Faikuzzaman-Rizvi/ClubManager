import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

/*
 * Role-aware navigation. The sections a role cannot reach are simply absent -
 * but that is presentation only: every route is still gated by ProtectedRoute,
 * and the API re-checks the JWT on every request.
 */
const ROLE_SECTIONS = {
  Admin: {
    label: 'Manage',
    links: [
      { to: '/admin', label: 'Dashboard', icon: '◆', end: true },
      { to: '/admin/teams', label: 'Teams', icon: '⬢' },
      { to: '/admin/players', label: 'Players', icon: '⚉' },
      { to: '/admin/matches', label: 'Matches', icon: '⚔' },
      { to: '/admin/users', label: 'Users', icon: '⚿' },
    ],
  },
  Coach: {
    label: 'My Team',
    links: [
      { to: '/coach', label: 'Dashboard', icon: '◆', end: true },
      { to: '/coach/players', label: 'My Squad', icon: '⚉' },
      { to: '/coach/results', label: 'Fixtures', icon: '⚔' },
    ],
  },
  Player: {
    label: 'My Club',
    links: [{ to: '/player/profile', label: 'My Profile', icon: '⚉' }],
  },
};

export default function Sidebar({ open, onNavigate }) {
  const { isAuthenticated, user, role } = useAuth();
  const section = isAuthenticated ? ROLE_SECTIONS[role] : null;

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="app-sidebar">
      <Link to="/" className="side-brand" onClick={onNavigate}>
        <span className="brand-ball" aria-hidden="true" />
        ClubManager
      </Link>

      <div className="side-section-label">Competition</div>
      <nav className="side-nav" aria-label="Competition">
        <NavLink to="/standings" onClick={onNavigate}>
          <span className="side-nav-icon" aria-hidden="true">▤</span>
          Standings
        </NavLink>
        <NavLink to="/topscorers" onClick={onNavigate}>
          <span className="side-nav-icon" aria-hidden="true">◎</span>
          Top Scorers
        </NavLink>
      </nav>

      {section && (
        <>
          <div className="side-section-label">{section.label}</div>
          <nav className="side-nav" aria-label={section.label}>
            {section.links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={onNavigate}>
                <span className="side-nav-icon" aria-hidden="true">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {!isAuthenticated && (
        <>
          <div className="side-section-label">Account</div>
          <nav className="side-nav" aria-label="Account">
            <NavLink to="/login" onClick={onNavigate}>
              <span className="side-nav-icon" aria-hidden="true">→</span>
              Log in
            </NavLink>
          </nav>
        </>
      )}

      {isAuthenticated && (
        <div className="side-foot">
          <div className="side-account">
            <span className="avatar" aria-hidden="true">
              {(user?.username ?? '??').slice(0, 2).toUpperCase()}
            </span>
            <span className="side-account-id">
              <span className="side-account-name">{user?.username}</span>
              <span className="side-account-role">{role}</span>
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
