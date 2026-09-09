import { useState } from 'react';
import { Link } from 'react-router-dom';

import StatCard from '../../components/dashboard/StatCard';
import MatchList from '../../components/dashboard/MatchList';
import StandingsWidget from '../../components/dashboard/StandingsWidget';
import TopScorersWidget from '../../components/dashboard/TopScorersWidget';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import Icon from '../../components/ui/Icon';
import useDashboardData, { greetingFor, splitMatches } from '../../api/useDashboardData';
import { useAuth } from '../../context/useAuth';

const PREVIEW = 4;

export default function AdminDashboard() {
  const { user } = useAuth();
  const data = useDashboardData();
  // Fixed at mount: a greeting that changed mid-session would be noise.
  const [greeting] = useState(() => greetingFor());

  const { played, upcoming } = splitMatches(data.matches);
  const goals = data.topScorers.reduce((sum, row) => sum + row.goals, 0);

  return (
    <>
      <section className="dash-hero">
        <div className="dash-hero-info">
          <h1 className="dash-greeting">
            {greeting}, <span className="dash-username">{user?.username}</span>
          </h1>
          <p className="dash-lead">
            Manage your club, teams, players and matches from one central tactical control panel.
          </p>
          <div className="dash-context">
            <span className="badge badge-admin">Administrator</span>
            <span className="dash-live-badge">
              <span className="dash-live-dot" />
              <span>Full Access · Season 2026</span>
            </span>
          </div>
        </div>

        <div className="quick-actions">
          <Link to="/admin/teams" className="btn-primary btn-small">
            <Icon name="plus" size={13} />
            <span>Add team</span>
          </Link>
          <Link to="/admin/players" className="btn-secondary btn-small">
            <Icon name="player" size={13} />
            <span>Add player</span>
          </Link>
          <Link to="/admin/matches" className="btn-secondary btn-small">
            <Icon name="matches" size={13} />
            <span>Schedule match</span>
          </Link>
          <Link to="/admin/users" className="btn-secondary btn-small">
            <Icon name="users" size={13} />
            <span>Create user</span>
          </Link>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard
          label="Teams"
          value={data.teams.length}
          icon="teams"
          variant="teams"
          foot="Active league clubs"
          loading={data.loading}
        />
        <StatCard
          label="Players"
          value={data.players.length}
          icon="player"
          variant="players"
          foot="Registered squad members"
          loading={data.loading}
        />
        <StatCard
          label="Matches played"
          value={played.length}
          icon="matches"
          variant="matches"
          foot={`${data.matches.length} fixtures in season`}
          loading={data.loading}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon="clock"
          variant="upcoming"
          foot={upcoming[0] ? `Next: ${upcoming[0].homeTeamName} v ${upcoming[0].awayTeamName}` : 'No matches queued'}
          loading={data.loading}
        />
        <StatCard
          label="Total Goals"
          value={goals}
          icon="topscorers"
          variant="goals"
          accent
          foot="League campaign total"
          loading={data.loading}
        />
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="section-title">
            <h2>Recent results</h2>
            <Link to="/admin/matches" className="btn-link">View all matches</Link>
          </div>

          {data.loading ? (
            <LoadingState rows={3} label="Loading matches" />
          ) : data.failed.matches ? (
            <ErrorState message="Matches could not be loaded." onRetry={data.reload} />
          ) : played.length === 0 ? (
            <EmptyState
              icon="⚔"
              title="No results yet"
              message="Once a match is completed its score will appear here."
              action={<Link to="/admin/matches" className="btn-secondary btn-small">Enter a result</Link>}
            />
          ) : (
            <MatchList matches={played.slice(0, PREVIEW)} />
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Upcoming fixtures</h2>
            <Link to="/admin/matches" className="btn-link">Schedule match</Link>
          </div>

          {data.loading ? (
            <LoadingState rows={3} label="Loading fixtures" />
          ) : data.failed.matches ? (
            <ErrorState message="Fixtures could not be loaded." onRetry={data.reload} />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon="◷"
              title="Nothing scheduled"
              message="Add a fixture to get the next match on the calendar."
              action={<Link to="/admin/matches" className="btn-secondary btn-small">Schedule a match</Link>}
            />
          ) : (
            <MatchList matches={upcoming.slice(0, PREVIEW)} />
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>League standings</h2>
            <Link to="/standings" className="btn-link">View full standings</Link>
          </div>

          {data.loading ? (
            <LoadingState rows={4} label="Loading standings" />
          ) : data.failed.standings ? (
            <ErrorState message="Standings could not be loaded." onRetry={data.reload} />
          ) : data.standings.length === 0 ? (
            <EmptyState icon="▤" title="No teams yet" message="Create a team to start the table." />
          ) : (
            <StandingsWidget standings={data.standings} />
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Top scorers</h2>
            <Link to="/topscorers" className="btn-link">View all top scorers</Link>
          </div>

          {data.loading ? (
            <LoadingState rows={4} label="Loading scorers" />
          ) : data.failed.topScorers ? (
            <ErrorState message="Top scorers could not be loaded." onRetry={data.reload} />
          ) : data.topScorers.length === 0 ? (
            <EmptyState icon="◎" title="No goals recorded" message="Goals appear here as results are entered." />
          ) : (
            <TopScorersWidget topScorers={data.topScorers} />
          )}
        </section>
      </div>
    </>
  );
}
