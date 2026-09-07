import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

/**
 * Chrome for every signed-in and public stats route. Owns the one piece of
 * layout state the sidebar and top bar share: whether the mobile drawer is open.
 *
 * The drawer records the route it was opened on rather than a plain boolean, so
 * navigating anywhere closes it during render - no effect, and no extra pass.
 */
export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const [openPath, setOpenPath] = useState(null);
  const navOpen = openPath === pathname;

  const close = () => setOpenPath(null);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Sidebar open={navOpen} onNavigate={close} />

      {navOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={close}
        />
      )}

      <div className="app-main">
        <TopBar navOpen={navOpen} onToggleNav={() => setOpenPath(navOpen ? null : pathname)} />
        <main className="content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
