import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './routes/ProtectedRoute';

// Public entry pages: keep Three.js, GSAP and visual showcase styles code-split.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
import NotFoundPage from './pages/NotFoundPage';
import StandingsPage from './pages/public/StandingsPage';
import TopScorersPage from './pages/public/TopScorersPage';

import AdminDashboard from './pages/admin/Dashboard';
import TeamsPage from './pages/admin/TeamsPage';
import PlayersPage from './pages/admin/PlayersPage';
import MatchesPage from './pages/admin/MatchesPage';
import UsersPage from './pages/admin/UsersPage';

import CoachDashboard from './pages/coach/Dashboard';
import MyTeamPlayers from './pages/coach/MyTeamPlayers';
import MatchResultEntry from './pages/coach/MatchResultEntry';

import MyProfile from './pages/player/MyProfile';

export default function App() {
  const { pathname } = useLocation();

  // One shared route table, rendered inside whichever layout applies.
  const routes = (
    <Suspense fallback={null}>
      <Routes>
        {/* Public - /api/stats/* is anonymous, so no token is needed. */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/topscorers" element={<TopScorersPage />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={<ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>}
        />
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
        <Route
          path="/coach"
          element={<ProtectedRoute roles={['Coach']}><CoachDashboard /></ProtectedRoute>}
        />
        <Route
          path="/coach/players"
          element={<ProtectedRoute roles={['Coach']}><MyTeamPlayers /></ProtectedRoute>}
        />
        <Route
          path="/coach/results"
          element={<ProtectedRoute roles={['Coach']}><MatchResultEntry /></ProtectedRoute>}
        />

        {/* Player - the profile is the player's whole surface. */}
        <Route path="/player" element={<Navigate to="/player/profile" replace />} />
        <Route
          path="/player/profile"
          element={<ProtectedRoute roles={['Player']}><MyProfile /></ProtectedRoute>}
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  // The login screen and landing page bring their own chrome and layouts.
  if (pathname === '/login' || pathname === '/') {
    return routes;
  }

  return <AppShell>{routes}</AppShell>;
}
