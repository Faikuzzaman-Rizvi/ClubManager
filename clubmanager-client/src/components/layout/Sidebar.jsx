import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import EntityImage from '../ui/EntityImage';
import Icon from '../ui/Icon';

/*
 * Role-aware navigation. The sections a role cannot reach are simply absent -
 * but that is presentation only: every route is still gated by ProtectedRoute,
 * and the API re-checks the JWT on every request.
 */
const ROLE_SECTIONS = {
  Admin: {
    label: 'Manage',
    links: [
      { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/admin/teams', label: 'Teams', icon: 'teams' },
      { to: '/admin/players', label: 'Players', icon: 'players' },
      { to: '/admin/matches', label: 'Matches', icon: 'matches' },
      { to: '/admin/users', label: 'User Accounts', icon: 'users' },
      { to: '/admin/profile', label: 'My Profile', icon: 'player' },
    ],
  },
  Coach: {
    label: 'My Team',
    links: [
      { to: '/coach', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/coach/players', label: 'My Squad', icon: 'players' },
      { to: '/coach/results', label: 'Fixtures', icon: 'matches' },
      { to: '/coach/profile', label: 'My Profile', icon: 'player' },
    ],
  },
  Player: {
    label: 'My Club',
    links: [{ to: '/player/profile', label: 'My Profile', icon: 'player' }],
  },
};

export default function Sidebar({ open, onNavigate }) {
  const { isAuthenticated, user, role } = useAuth();
  const section = isAuthenticated ? ROLE_SECTIONS[role] : null;
  const profileRoute =
    role === 'Admin' ? '/admin/profile' : role === 'Coach' ? '/coach/profile' : '/player/profile';

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="app-sidebar">
      <Link to="/" className="side-brand" onClick={onNavigate}>
        <div className="side-brand-emblem">
          <Icon name="ball" size={18} />
        </div>
        <div className="side-brand-meta">
          <span className="side-brand-title">CLUB<span className="gold-accent">MANAGER</span></span>
          <span className="side-brand-sub">PREMIER OS · 2026</span>
        </div>
      </Link>

      <div className="side-section-label">Competition</div>
      <nav className="side-nav" aria-label="Competition">
        <NavLink to="/standings" onClick={onNavigate}>
          <span className="side-nav-icon" aria-hidden="true">
            <Icon name="standings" size={16} />
          </span>
          Standings
        </NavLink>
        <NavLink to="/topscorers" onClick={onNavigate}>
          <span className="side-nav-icon" aria-hidden="true">
            <Icon name="topscorers" size={16} />
          </span>
          Top Scorers
        </NavLink>
      </nav>

      {section && (
        <>
          <div className="side-section-label">{section.label}</div>
          <nav className="side-nav" aria-label={section.label}>
            {section.links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={onNavigate}>
                <span className="side-nav-icon" aria-hidden="true">
                  <Icon name={link.icon} size={16} />
                </span>
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
              <span className="side-nav-icon" aria-hidden="true">
                <Icon name="login" size={16} />
              </span>
              Log in
            </NavLink>
          </nav>
        </>
      )}

      {isAuthenticated && (
        <div className="side-foot">
          <Link
            to={profileRoute}
            className="side-account"
            onClick={onNavigate}
            title="View your profile"
          >
            <div className="side-account-avatar-wrap">
              <EntityImage
                src={user?.avatarUrl}
                name={user?.username}
                variant="avatar"
                className="entity-image-sm"
              />
              <span className="online-dot" title="Active session" />
            </div>
            <div className="side-account-id">
              <span className="side-account-name">{user?.username}</span>
              <span className={`badge badge-sm badge-${(role ?? '').toLowerCase()}`}>{role}</span>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
