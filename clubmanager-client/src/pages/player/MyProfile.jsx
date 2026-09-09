import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';
import { formatMatchDay } from '../../helpers/datetime';
import StatCard from '../../components/dashboard/StatCard';
import EntityImage from '../../components/ui/EntityImage';
import ImageUpload from '../../components/ui/ImageUpload';
import Icon from '../../components/ui/Icon';
import { imageEndpoints } from '../../api/images';
import { useAuth } from '../../context/useAuth';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

const RECENT_MATCH_COUNT = 5;

/**
 * A Player's own record plus the stats reachable from their role: goals and
 * chart position come from the public top-scorer list, the team's league
 * standing from the public table, and the fixture list from /api/matches.
 * Also provides account credential updates (username and password).
 */
export default function MyProfile() {
  const { user, updateAvatar, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({ loading: true, unlinked: false, error: null });
  const [stats, setStats] = useState({ goals: 0, rank: null, standing: null, matches: [], error: null });

  const [form, setForm] = useState({
    username: user?.username || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formNotice, setFormNotice] = useState(null);

  const load = useCallback(async () => {
    let me;

    try {
      me = (await axiosClient.get('/api/players/me')).data;
      setProfile(me);
      setStatus({ loading: false, unlinked: false, error: null });
    } catch (error) {
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

  async function handleAccountUpdate(e) {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);

    const trimmedUsername = form.username.trim();
    if (trimmedUsername.length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }

    if (form.newPassword) {
      if (form.newPassword.length < 6) {
        setFormError('New password must be at least 6 characters.');
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setFormError('New password and confirmation do not match.');
        return;
      }
      if (!form.currentPassword) {
        setFormError('Current password is required to set a new password.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        username: trimmedUsername,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      };

      const res = await axiosClient.put('/api/users/me', payload);
      updateUser({ username: res.data.username });
      setFormNotice('Account details updated successfully.');
      setForm((prev) => ({
        ...prev,
        username: res.data.username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Failed to update account details.'));
    } finally {
      setSaving(false);
    }
  }

  if (status.loading) {
    return (
      <div className="card">
        <LoadingState rows={5} label="Loading your profile" />
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
        <EntityImage
          src={profile ? profile.imageUrl : user?.avatarUrl}
          name={profile ? profile.name : user?.username}
          variant="avatar"
          className="entity-image-2xl"
          eager
        />

        {profile && (
          <span className="jersey-badge jersey-badge-lg">
            {profile.jerseyNumber ?? '-'}
          </span>
        )}

        <div className="profile-identity">
          <h1>{profile ? profile.name : user?.username}</h1>
          <p className="profile-meta">
            <span className="badge badge-player">{profile?.position ?? 'Player'}</span>
            {profile?.teamName && (
              <span className="team-cell">
                <EntityImage
                  src={profile.teamLogoUrl}
                  name={profile.teamName}
                  variant="logo"
                  className="entity-image-sm"
                />
                <span>{profile.teamName}</span>
              </span>
            )}
            {profile?.age != null && <span>· Age {profile.age}</span>}
          </p>
        </div>

        <div className="profile-avatar-edit">
          <ImageUpload
            endpoint={imageEndpoints.ownAvatar()}
            value={user?.avatarUrl}
            name={user?.username ?? profile?.name}
            variant="avatar"
            label="My account picture"
            helpText="Shown next to your name. Remove it to fall back to your squad photo."
            canRemove={Boolean(user?.hasOwnAvatar)}
            onChange={(url, { removed }) => updateAvatar(url, !removed)}
          />
        </div>
      </section>

      {status.unlinked ? (
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <EmptyState
            icon="⚉"
            title="No player record linked yet"
            message="This login is not linked to a player record yet. An administrator links your login to a squad member on the Players screen."
          />
        </div>
      ) : (
        <>
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
              Goals count every match on record. Your player record details are maintained by your coach or an
              admin.
            </p>
          </div>
        </>
      )}

      <div className="card profile-edit-card">
        <div className="section-title">
          <h2>Account & Login Credentials</h2>
        </div>

        {formError && <p className="error" role="alert">{formError}</p>}
        {formNotice && <p className="notice" role="status">{formNotice}</p>}

        <form onSubmit={handleAccountUpdate}>
          <div className="profile-form-grid">
            <div className="profile-form-group">
              <label htmlFor="player-username">Account Username</label>
              <input
                id="player-username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="player-role">Role</label>
              <input
                id="player-role"
                type="text"
                value="Player"
                disabled
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="player-curr-pass">Current Password</label>
              <input
                id="player-curr-pass"
                type="password"
                placeholder="Required only if changing password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="player-new-pass">New Password</label>
              <input
                id="player-new-pass"
                type="password"
                placeholder="Leave blank to keep unchanged"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="player-confirm-pass">Confirm New Password</label>
              <input
                id="player-confirm-pass"
                type="password"
                placeholder="Repeat new password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="profile-actions-row">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Icon name="check" size={15} />
              <span>{saving ? 'Saving changes...' : 'Save Account Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
