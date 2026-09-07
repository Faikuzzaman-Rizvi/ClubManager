import { useState } from 'react';
import { Link } from 'react-router-dom';

import StatCard from '../../components/dashboard/StatCard';
import MatchList from '../../components/dashboard/MatchList';
import StandingsWidget from '../../components/dashboard/StandingsWidget';
import TopScorersWidget from '../../components/dashboard/TopScorersWidget';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
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
        <div>
          <h1 className="dash-greeting">
            {greeting}, {user?.username}
          </h1>
          <p className="muted">
            Manage your club, teams, players and matches from one place.
          </p>
          <div className="dash-context">
            <span className="badge badge-admin">Admin</span>
            <span className="muted">Full access across every team</span>
          </div>
        </div>

        <div className="quick-actions">
          <Link to="/admin/teams" className="btn-primary btn-small">Add team</Link>
          <Link to="/admin/players" className="btn-secondary btn-small">Add player</Link>
          <Link to="/admin/matches" className="btn-secondary btn-small">Schedule match</Link>
          <Link to="/admin/users" className="btn-secondary btn-small">Create user</Link>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard label="Teams" value={data.teams.length} icon="⬢" loading={data.loading} />
        <StatCard label="Players" value={data.players.length} icon="⚉" loading={data.loading} />
        <StatCard
          label="Matches played"
          value={played.length}
          icon="⚔"
          foot={`${data.matches.length} scheduled in total`}
          loading={data.loading}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon="◷"
          foot={upcoming[0] ? `Next: ${upcoming[0].homeTeamName} v ${upcoming[0].awayTeamName}` : 'Nothing scheduled'}
          loading={data.loading}
        />
        <StatCard label="Goals" value={goals} icon="◎" accent loading={data.loading} />
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
            <Link to="/admin/matches" className="btn-link">Schedule</Link>
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
