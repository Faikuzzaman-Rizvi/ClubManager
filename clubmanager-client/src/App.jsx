import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ProtectedRoute from './routes/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import StandingsPage from './pages/public/StandingsPage';
import TopScorersPage from './pages/public/TopScorersPage';

import TeamsPage from './pages/admin/TeamsPage';
import PlayersPage from './pages/admin/PlayersPage';
import MatchesPage from './pages/admin/MatchesPage';
import UsersPage from './pages/admin/UsersPage';

import MyTeamPlayers from './pages/coach/MyTeamPlayers';
import MatchResultEntry from './pages/coach/MatchResultEntry';

import MyProfile from './pages/player/MyProfile';

export default function App() {
  const { pathname } = useLocation();

  // One shared route table, rendered inside whichever layout applies.
  const routes = (
    <Routes>
      <Route path="/" element={<Navigate to="/standings" replace />} />

      {/* Public - /api/stats/* is anonymous, so no token is needed. */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/standings" element={<StandingsPage />} />
      <Route path="/topscorers" element={<TopScorersPage />} />

      {/* Admin */}
      <Route path="/admin" element={<Navigate to="/admin/teams" replace />} />
      <Route
        path="/admin/teams"
        element={<ProtectedRoute roles={['Admin']}><TeamsPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/players"
        element={<ProtectedRoute roles={['Admin']}><PlayersPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/matches"
        element={<ProtectedRoute roles={['Admin']}><MatchesPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/users"
        element={<ProtectedRoute roles={['Admin']}><UsersPage /></ProtectedRoute>}
      />

      {/* Coach */}
      <Route path="/coach" element={<Navigate to="/coach/players" replace />} />
      <Route
        path="/coach/players"
        element={<ProtectedRoute roles={['Coach']}><MyTeamPlayers /></ProtectedRoute>}
      />
      <Route
        path="/coach/results"
        element={<ProtectedRoute roles={['Coach']}><MatchResultEntry /></ProtectedRoute>}
      />

      {/* Player */}
      <Route path="/player" element={<Navigate to="/player/profile" replace />} />
      <Route
        path="/player/profile"
        element={<ProtectedRoute roles={['Player']}><MyProfile /></ProtectedRoute>}
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  // The login screen is full-bleed brand green with no chrome around it.
  if (pathname === '/login') {
    return <div className="auth-screen">{routes}</div>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="content">{routes}</main>
      </div>
    </div>
  );
}
