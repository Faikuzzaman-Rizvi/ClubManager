import { useState } from 'react';
import { Link } from 'react-router-dom';

import StatCard from '../../components/dashboard/StatCard';
import MatchList from '../../components/dashboard/MatchList';
import StandingsWidget from '../../components/dashboard/StandingsWidget';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import useDashboardData, { greetingFor, splitMatches } from '../../api/useDashboardData';
import { useAuth } from '../../context/useAuth';

const PREVIEW = 4;

export default function CoachDashboard() {
  const { user } = useAuth();
  const teamId = user?.teamId ?? null;
  const data = useDashboardData();
  const [greeting] = useState(() => greetingFor());

  // Users.TeamId is only set for a Coach; without it every write is refused.
  if (teamId == null) {
    return (
      <div className="card">
        <h1>Dashboard</h1>
        <p className="error" role="alert">
          This coach account is not linked to a team, so there is nothing to manage yet. Ask an
          admin to assign one.
        </p>
      </div>
    );
  }

  const team = data.teams.find((row) => row.teamId === teamId);
  const teamName = team?.teamName ?? 'My team';

  // /api/matches is unscoped by design, so the coach view narrows it here.
  const myMatches = data.matches.filter(
    (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
  );
  const { played, upcoming } = splitMatches(myMatches);

  const standing = data.standings.find((row) => row.teamId === teamId);
  const position = data.standings.findIndex((row) => row.teamId === teamId) + 1;
  const squadGoals = data.topScorers.filter((row) => row.teamId === teamId);

  return (
    <>
      <section className="dash-hero">
        <div>
          <h1 className="dash-greeting">
            {greeting}, {user?.username}
          </h1>
          <p className="muted">
            Your squad, your fixtures and your results - all scoped to {teamName}.
          </p>
          <div className="dash-context">
            <span className="badge badge-coach">Coach</span>
            <span className="muted">{teamName}</span>
          </div>
        </div>

        <div className="quick-actions">
          <Link to="/coach/players" className="btn-primary btn-small">Add player</Link>
          <Link to="/coach/results" className="btn-secondary btn-small">Enter result</Link>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard label="Squad size" value={data.players.length} icon="⚉" loading={data.loading} />
        <StatCard
          label="League position"
          value={position > 0 ? `#${position}` : '—'}
          icon="▤"
          foot={standing ? `${standing.points} points` : 'No completed matches'}
          accent
          loading={data.loading}
        />
        <StatCard
          label="Record"
          value={standing ? `${standing.won}-${standing.drawn}-${standing.lost}` : '—'}
          icon="◈"
          foot="Won - drawn - lost"
          loading={data.loading}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon="◷"
          foot={upcoming[0] ? `Next: ${upcoming[0].homeTeamName} v ${upcoming[0].awayTeamName}` : 'Nothing scheduled'}
          loading={data.loading}
        />
        <StatCard
          label="Squad goals"
          value={squadGoals.reduce((sum, row) => sum + row.goals, 0)}
          icon="◎"
          foot={squadGoals[0] ? `Top: ${squadGoals[0].playerName}` : 'No goals yet'}
          loading={data.loading}
        />
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="section-title">
            <h2>Recent results</h2>
            <Link to="/coach/results" className="btn-link">View all fixtures</Link>
          </div>

          {data.loading ? (
            <LoadingState rows={3} label="Loading results" />
          ) : data.failed.matches ? (
            <ErrorState message="Matches could not be loaded." onRetry={data.reload} />
          ) : played.length === 0 ? (
            <EmptyState
              icon="⚔"
              title="No results yet"
              message="Enter a score against one of your fixtures and it will show up here."
              action={<Link to="/coach/results" className="btn-secondary btn-small">Enter a result</Link>}
            />
          ) : (
            <MatchList matches={played.slice(0, PREVIEW)} highlightTeamId={teamId} />
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Upcoming fixtures</h2>
            <Link to="/coach/results" className="btn-link">Schedule</Link>
          </div>

          {data.loading ? (
            <LoadingState rows={3} label="Loading fixtures" />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon="◷"
              title="Nothing scheduled"
              message="Schedule your team's next fixture to see it here."
              action={<Link to="/coach/results" className="btn-secondary btn-small">Schedule a match</Link>}
            />
          ) : (
            <MatchList matches={upcoming.slice(0, PREVIEW)} highlightTeamId={teamId} />
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
          ) : (
            <StandingsWidget standings={data.standings} myTeamId={teamId} />
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Squad scorers</h2>
            <Link to="/coach/players" className="btn-link">My squad</Link>
          </div>

          {data.loading ? (
            <LoadingState rows={3} label="Loading scorers" />
          ) : squadGoals.length === 0 ? (
            <EmptyState
              icon="◎"
              title="No goals yet"
              message="Record goals against a match and your scorers will appear here."
            />
          ) : (
            <ol className="scorer-list">
              {squadGoals.slice(0, 5).map((scorer, index) => (
                <li className={`scorer-row ${index < 3 ? 'is-podium' : ''}`} key={scorer.playerId}>
                  <span className="scorer-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="scorer-id">
                    <span className="scorer-name">{scorer.playerName}</span>
                    <span className="scorer-team">{scorer.teamName}</span>
                  </span>
                  <span className="scorer-goals">{scorer.goals}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
