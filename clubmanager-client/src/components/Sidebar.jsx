import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/* Per-role sections. Coach's results page is labelled Fixtures per the design. */
const ROLE_SECTIONS = {
  Admin: {
    label: 'Manage',
    links: [
      { to: '/admin/teams', label: 'Teams' },
      { to: '/admin/players', label: 'Players' },
      { to: '/admin/matches', label: 'Matches' },
      { to: '/admin/users', label: 'Users' },
    ],
  },
  Coach: {
    label: 'My Team',
    links: [
      { to: '/coach/players', label: 'My Squad' },
      { to: '/coach/results', label: 'Fixtures' },
    ],
  },
  Player: {
    label: 'My Club',
    links: [{ to: '/player/profile', label: 'My Profile' }],
  },
};

export default function Sidebar() {
  const { isAuthenticated, role } = useAuth();
  const section = isAuthenticated ? ROLE_SECTIONS[role] : null;

  return (
    <aside className="sidebar">
      <Link to="/standings" className="side-brand">
        <span className="brand-ball" aria-hidden="true" />
        ClubManager
      </Link>

      <div className="side-section-label">Competition</div>
      <nav className="side-nav">
        <NavLink to="/standings">Standings</NavLink>
        <NavLink to="/topscorers">Top Scorers</NavLink>
      </nav>

      {section && (
        <>
          <div className="side-section-label">{section.label}</div>
          <nav className="side-nav">
            {section.links.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {!isAuthenticated && (
        <>
          <div className="side-section-label">Account</div>
          <nav className="side-nav">
            <NavLink to="/login">Log in</NavLink>
          </nav>
        </>
      )}

      <div className="side-foot">ClubManager</div>
    </aside>
  );
}
