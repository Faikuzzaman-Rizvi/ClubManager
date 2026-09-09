import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';
import { useAuth } from '../../context/useAuth';
import { imageEndpoints } from '../../api/images';
import PageHeader from '../../components/ui/PageHeader';
import EntityImage from '../../components/ui/EntityImage';
import ImageUpload from '../../components/ui/ImageUpload';
import StatCard from '../../components/dashboard/StatCard';
import Icon from '../../components/ui/Icon';
import { LoadingState } from '../../components/ui/States';
import { formatMatchDay } from '../../helpers/datetime';

export default function CoachProfile() {
  const { user, updateAvatar, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState({
    squadSize: 0,
    position: '—',
    record: '—',
    points: '—',
    goals: 0,
  });

  const [form, setForm] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, playersRes, standingsRes, scorersRes] = await Promise.all([
          axiosClient.get('/api/users/me'),
          axiosClient.get('/api/players'),
          axiosClient.get('/api/stats/standings'),
          axiosClient.get('/api/stats/topscorers'),
        ]);

        const prof = profRes.data;
        setProfile(prof);
        setForm((prev) => ({ ...prev, username: prof.username }));

        const myTeamId = prof.teamId;
        const mySquad = playersRes.data.filter((p) => p.teamId === myTeamId);
        const standing = standingsRes.data.find((s) => s.teamId === myTeamId);
        const posIndex = standingsRes.data.findIndex((s) => s.teamId === myTeamId);
        const myGoals = scorersRes.data
          .filter((s) => s.teamId === myTeamId)
          .reduce((sum, s) => sum + s.goals, 0);

        setTeamStats({
          squadSize: mySquad.length,
          position: posIndex >= 0 ? `#${posIndex + 1}` : '—',
          record: standing ? `${standing.won}-${standing.drawn}-${standing.lost}` : '—',
          points: standing ? `${standing.points} pts` : '—',
          goals: myGoals,
        });
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load coach profile.'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleUpdate(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedUsername = form.username.trim();
    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (form.newPassword) {
      if (form.newPassword.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setError('New password and confirmation do not match.');
        return;
      }
      if (!form.currentPassword) {
        setError('Current password is required to set a new password.');
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
      setProfile(res.data);
      updateUser({ username: res.data.username });
      setNotice('Coach profile updated successfully.');
      setForm((prev) => ({
        ...prev,
        username: res.data.username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update coach profile.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={4} label="Loading coach profile..." />
      </div>
    );
  }

  const effectiveUser = profile || user;

  return (
    <>
      <PageHeader
        title="Coach Profile"
        subtitle="Manage your tactical coach credentials and view your club squad overview."
      />

      <section className="profile-head">
        <EntityImage
          src={effectiveUser?.avatarUrl}
          name={effectiveUser?.username}
          variant="avatar"
          className="entity-image-2xl"
          eager
        />

        <div className="profile-identity">
          <h1>{effectiveUser?.username}</h1>
          <p className="profile-meta">
            <span className="badge badge-coach">Head Coach</span>
            {effectiveUser?.teamName && (
              <span className="team-cell">
                <EntityImage
                  src={effectiveUser.teamLogoUrl}
                  name={effectiveUser.teamName}
                  variant="logo"
                  className="entity-image-sm"
                />
                <span>{effectiveUser.teamName}</span>
              </span>
            )}
            {effectiveUser?.createdAt && (
              <span>· Club manager since {formatMatchDay(effectiveUser.createdAt)}</span>
            )}
          </p>
        </div>

        <div className="profile-avatar-edit">
          <ImageUpload
            endpoint={imageEndpoints.ownAvatar()}
            value={effectiveUser?.avatarUrl}
            name={effectiveUser?.username}
            variant="avatar"
            label="Coach Picture"
            helpText="Upload your tactical coaching avatar. JPG, PNG, or WebP up to 5MB."
            canRemove={Boolean(effectiveUser?.hasOwnAvatar)}
            onChange={(url, { removed }) => {
              updateAvatar(url, !removed);
              setProfile((p) => (p ? { ...p, avatarUrl: url, hasOwnAvatar: !removed } : p));
            }}
          />
        </div>
      </section>

      <div className="stat-grid">
        <StatCard
          label="First-Team Squad"
          value={teamStats.squadSize}
          icon="players"
          variant="players"
          foot="Registered squad players"
        />
        <StatCard
          label="League Position"
          value={teamStats.position}
          icon="standings"
          variant="goals"
          accent
          foot="Current table rank"
        />
        <StatCard
          label="Record (W-D-L)"
          value={teamStats.record}
          icon="matches"
          variant="matches"
          foot="Completed league fixtures"
        />
        <StatCard
          label="League Points"
          value={teamStats.points}
          icon="standings"
          variant="teams"
          foot="Season campaign points"
        />
        <StatCard
          label="Squad Goals"
          value={teamStats.goals}
          icon="topscorers"
          variant="goals"
          foot="Total goals scored"
        />
      </div>

      <div className="card profile-edit-card">
        <div className="section-title">
          <h2>Coach Profile & Account Settings</h2>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}

        <form onSubmit={handleUpdate}>
          <div className="profile-form-grid">
            <div className="profile-form-group">
              <label htmlFor="coach-username">Username</label>
              <input
                id="coach-username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="coach-team">Assigned Club</label>
              <input
                id="coach-team"
                type="text"
                value={effectiveUser?.teamName ? `${effectiveUser.teamName} (Managed by Administrator)` : 'Unassigned'}
                disabled
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="coach-curr-pass">Current Password</label>
              <input
                id="coach-curr-pass"
                type="password"
                placeholder="Required only if changing password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="coach-new-pass">New Password</label>
              <input
                id="coach-new-pass"
                type="password"
                placeholder="Leave blank to keep unchanged"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="coach-confirm-pass">Confirm New Password</label>
              <input
                id="coach-confirm-pass"
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
              <span>{saving ? 'Saving changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card profile-edit-card">
        <div className="section-title">
          <h2>Squad Management Actions</h2>
        </div>
        <div className="quick-actions">
          <Link to="/coach/players" className="btn-secondary btn-small">
            <Icon name="players" size={14} />
            <span>Manage Squad Players</span>
          </Link>
          <Link to="/coach/results" className="btn-secondary btn-small">
            <Icon name="matches" size={14} />
            <span>Match Results & Fixtures</span>
          </Link>
          <Link to="/standings" className="btn-secondary btn-small">
            <Icon name="standings" size={14} />
            <span>View Full Standings</span>
          </Link>
        </div>
      </div>
    </>
  );
}
