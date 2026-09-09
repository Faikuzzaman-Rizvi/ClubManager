import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';
import { formatMatchDay } from '../../helpers/datetime';
import StatCard from '../../components/dashboard/StatCard';
import EntityImage from '../../components/ui/EntityImage';
import ImageUpload from '../../components/ui/ImageUpload';
import { imageEndpoints } from '../../api/images';
import { useAuth } from '../../context/useAuth';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

const RECENT_MATCH_COUNT = 5;

/**
 * A Player's own record plus the stats reachable from their role: goals and
 * chart position come from the public top-scorer list, the team's league
 * standing from the public table, and the fixture list from /api/matches, which
 * every signed-in role may read. There is no player-scoped stats endpoint, so
 * nothing here needs one.
 */
export default function MyProfile() {
  const { user, updateAvatar } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({ loading: true, unlinked: false, error: null });
  const [stats, setStats] = useState({ goals: 0, rank: null, standing: null, matches: [], error: null });

  const load = useCallback(async () => {
    let me;

    try {
      me = (await axiosClient.get('/api/players/me')).data;
      setProfile(me);
      setStatus({ loading: false, unlinked: false, error: null });
    } catch (error) {
      // 404 is the documented answer for a login with no player record behind
      // it - an empty state, not a failure.
      setStatus({
        loading: false,
        unlinked: error.response?.status === 404,
        error:
          error.response?.status === 404
            ? null
            : apiErrorMessage(error, 'Could not load your profile.'),
      });
      return;
    }

    try {
      const [scorers, standings, matches] = await Promise.all([
        axiosClient.get('/api/stats/topscorers'),
        axiosClient.get('/api/stats/standings'),
        axiosClient.get('/api/matches'),
      ]);

      const scorerIndex = scorers.data.findIndex((row) => row.playerId === me.playerId);

      setStats({
        goals: scorerIndex >= 0 ? scorers.data[scorerIndex].goals : 0,
        rank: scorerIndex >= 0 ? scorerIndex + 1 : null,
        standing: standings.data.find((row) => row.teamId === me.teamId) ?? null,
        matches: matches.data
          .filter((match) => match.homeTeamId === me.teamId || match.awayTeamId === me.teamId)
          .slice(0, RECENT_MATCH_COUNT),
        error: null,
      });
    } catch (error) {
      setStats((current) => ({
        ...current,
        error: apiErrorMessage(error, 'Could not load your statistics.'),
      }));
    }
  }, []);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  if (status.loading) {
    return (
      <div className="card">
        <LoadingState rows={5} label="Loading your profile" />
      </div>
    );
  }

  if (status.unlinked) {
    return (
      <div className="card">
        <EmptyState
          icon="⚉"
          title="No player record linked"
          message="This login is not linked to a player record yet, so there is nothing to show. An admin links the two together on the Players screen."
        />
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="card">
        <ErrorState message={status.error} onRetry={load} />
      </div>
    );
  }

  const standing = stats.standing;
  const leaguePosition = standing ? `${standing.points} pts` : '-';

  return (
    <>
      <section className="profile-head">
        {/*
          The squad photo, which only an Admin or this player's Coach may change -
          so it is shown here, not offered for editing. The avatar below is the
          part a Player owns.
        */}
        <EntityImage
          src={profile.imageUrl}
          name={profile.name}
          variant="avatar"
          className="entity-image-2xl"
          eager
        />

        <span className="jersey-badge jersey-badge-lg">
          {profile.jerseyNumber ?? '-'}
        </span>

        <div className="profile-identity">
          <h1>{profile.name}</h1>
          <p className="profile-meta">
            <span className="badge badge-player">{profile.position ?? 'Squad player'}</span>
            <span className="team-cell">
              <EntityImage
                src={profile.teamLogoUrl}
                name={profile.teamName}
                variant="logo"
                className="entity-image-sm"
              />
              <span>{profile.teamName}</span>
            </span>
            {profile.age != null && <span>· Age {profile.age}</span>}
          </p>
        </div>

        <div className="profile-avatar-edit">
          {/*
            A Player may set the picture on their own ACCOUNT, never on their
            player record - that stays with the Admin and their Coach. Clearing
            it falls back to the squad photo above, which is why the API's reply
            is fed straight back in rather than assumed to be null.
          */}
          <ImageUpload
            endpoint={imageEndpoints.ownAvatar()}
            value={user?.avatarUrl}
            name={user?.username ?? profile.name}
            variant="avatar"
            label="My account picture"
            helpText="Shown next to your name. Remove it to fall back to your squad photo."
            canRemove={Boolean(user?.hasOwnAvatar)}
            onChange={(url, { removed }) => updateAvatar(url, !removed)}
          />
        </div>
      </section>

      <div className="stat-grid">
        <StatCard label="Goals" value={stats.goals} icon="ball" variant="goals" accent />
        <StatCard
          label="Top-scorer rank"
          value={stats.rank ? `#${stats.rank}` : '—'}
          icon="topscorers"
          variant="goals"
          foot={stats.rank ? 'Across the competition' : 'Not on the chart yet'}
        />
        <StatCard
          label="Team matches"
          value={standing ? standing.played : '—'}
          icon="matches"
          variant="matches"
          foot="Completed fixtures"
        />
        <StatCard
          label="Team W-D-L"
          value={standing ? `${standing.won}-${standing.drawn}-${standing.lost}` : '—'}
          icon="standings"
          variant="teams"
        />
        <StatCard label="Team points" value={leaguePosition} icon="standings" variant="teams" />
      </div>

      {stats.error && (
        <p className="error" role="alert">
          {stats.error}
        </p>
      )}

      <div className="card">
        <div className="section-title">
          <h2>{profile.teamName} - recent matches</h2>
        </div>

        {stats.matches.length === 0 ? (
          <EmptyState
            icon="⚔"
            title="No matches yet"
            message="Your team has no fixtures on record. They will appear here once scheduled."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Venue</th>
                  <th className="num">Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.matches.map((match) => {
                  const atHome = match.homeTeamId === profile.teamId;
                  const opponent = atHome ? match.awayTeamName : match.homeTeamName;
                  const opponentLogo = atHome ? match.awayTeamLogoUrl : match.homeTeamLogoUrl;
                  const completed = match.status === 'Completed';

                  return (
                    <tr key={match.matchId}>
                      <td>{formatMatchDay(match.matchDate)}</td>
                      <td className="table-id">
                        <span className="team-cell">
                          <EntityImage
                            src={opponentLogo}
                            name={opponent}
                            variant="logo"
                            className="entity-image-sm"
                          />
                          <span>{opponent}</span>
                        </span>
                      </td>
                      <td>{atHome ? 'Home' : 'Away'}</td>
                      <td className="num strong">
                        {completed ? (
                          `${atHome ? match.homeScore : match.awayScore} - ${
                            atHome ? match.awayScore : match.homeScore
                          }`
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={completed ? 'pill pill-completed' : 'pill pill-scheduled'}
                        >
                          {match.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="hint">
          Goals count every match on record. Your own details are maintained by your coach or an
          admin.
        </p>
      </div>
    </>
  );
}
