import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { homePathForRole } from '../../routes/roleHome';
import Icon from '../ui/Icon';

/*
 * The landing page's own chrome. The signed-in app uses Sidebar + TopBar; this
 * is the public-facing equivalent and only ever appears on "/".
 *
 * Section links scroll within the page rather than pointing at /admin/teams and
 * friends: those routes are Admin-only, so sending a logged-out visitor there
 * would just bounce them to the login screen. The public equivalents live on
 * this page, and each section carries its own CTA through to the real route.
 */
const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'matches', label: 'Matches' },
  { id: 'squad', label: 'Squad' },
  { id: 'standings', label: 'Standings' },
  { id: 'scorers', label: 'Top Scorers' },
];

export default function LandingNav() {
  const { isAuthenticated, user, role } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver rather than a scroll handler: the browser does the
  // maths, and it costs nothing while the page is idle.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.1, 0.5, 1] },
    );

    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  function goTo(event, id) {
    event.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return (
    <header className={`ld-nav ${scrolled ? 'is-scrolled' : ''}`} data-hero="nav">
      <div className="ld-nav-inner">
        <a href="#home" className="ld-brand" onClick={(e) => goTo(e, 'home')}>
          <span className="ld-crest" aria-hidden="true" />
          ClubManager
        </a>

        <button
          type="button"
          className="ld-nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="ld-nav-links"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
        </button>

        <nav
          id="ld-nav-links"
          className={`ld-nav-links ${menuOpen ? 'is-open' : ''}`}
          aria-label="Landing page sections"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={active === section.id ? 'is-active' : ''}
              aria-current={active === section.id ? 'true' : undefined}
              onClick={(e) => goTo(e, section.id)}
            >
              {section.label}
            </a>
          ))}

          {isAuthenticated ? (
            <Link to={homePathForRole(role)} className="ld-btn ld-btn-small" onClick={() => setMenuOpen(false)}>
              {user?.username ? `Open ${role} area` : 'Open app'}
            </Link>
          ) : (
            <Link to="/login" className="ld-btn ld-btn-small" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
