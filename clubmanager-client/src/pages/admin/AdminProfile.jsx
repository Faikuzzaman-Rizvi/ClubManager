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

export default function AdminProfile() {
  const { user, updateAvatar, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ teams: 0, players: 0, matches: 0, users: 0 });

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
        const [profRes, teamsRes, playersRes, matchesRes, usersRes] = await Promise.all([
          axiosClient.get('/api/users/me'),
          axiosClient.get('/api/teams'),
          axiosClient.get('/api/players'),
          axiosClient.get('/api/matches'),
          axiosClient.get('/api/users'),
        ]);

        setProfile(profRes.data);
        setForm((prev) => ({ ...prev, username: profRes.data.username }));
        setCounts({
          teams: teamsRes.data.length,
          players: playersRes.data.length,
          matches: matchesRes.data.length,
          users: usersRes.data.length,
        });
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load profile details.'));
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
      setNotice('Profile details updated successfully.');
      setForm((prev) => ({
        ...prev,
        username: res.data.username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={4} label="Loading admin profile..." />
      </div>
    );
  }

  const effectiveUser = profile || user;

  return (
    <>
      <PageHeader
        title="Admin Profile"
        subtitle="Manage your tactical administrator credentials, picture and system overview."
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
            <span className="badge badge-admin">Administrator</span>
            <span>Premier OS · Season 2026</span>
            {effectiveUser?.createdAt && (
              <span>· Member since {formatMatchDay(effectiveUser.createdAt)}</span>
            )}
          </p>
        </div>

        <div className="profile-avatar-edit">
          <ImageUpload
            endpoint={imageEndpoints.ownAvatar()}
            value={effectiveUser?.avatarUrl}
            name={effectiveUser?.username}
            variant="avatar"
            label="Profile Picture"
            helpText="Upload a custom administrator avatar. JPG, PNG, or WebP up to 5MB."
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
          label="Managed Teams"
          value={counts.teams}
          icon="teams"
          variant="teams"
          foot="Active league clubs"
        />
        <StatCard
          label="Registered Players"
          value={counts.players}
          icon="players"
          variant="players"
          foot="First-team squad members"
        />
        <StatCard
          label="Fixtures on Record"
          value={counts.matches}
          icon="matches"
          variant="matches"
          foot="Scheduled & completed"
        />
        <StatCard
          label="System User Accounts"
          value={counts.users}
          icon="users"
          variant="goals"
          accent
          foot="Admins, Coaches, Players"
        />
      </div>

      <div className="card profile-edit-card">
        <div className="section-title">
          <h2>Tactical Profile & Credentials</h2>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}

        <form onSubmit={handleUpdate}>
          <div className="profile-form-grid">
            <div className="profile-form-group">
              <label htmlFor="admin-username">Username</label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="admin-role">System Role</label>
              <input
                id="admin-role"
                type="text"
                value="Administrator"
                disabled
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="admin-curr-pass">Current Password</label>
              <input
                id="admin-curr-pass"
                type="password"
                placeholder="Required only if changing password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="admin-new-pass">New Password</label>
              <input
                id="admin-new-pass"
                type="password"
                placeholder="Leave blank to keep unchanged"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="admin-confirm-pass">Confirm New Password</label>
              <input
                id="admin-confirm-pass"
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
          <h2>Quick Tactical Shortcuts</h2>
        </div>
        <div className="quick-actions">
          <Link to="/admin/teams" className="btn-secondary btn-small">
            <Icon name="teams" size={14} />
            <span>Manage Teams</span>
          </Link>
          <Link to="/admin/players" className="btn-secondary btn-small">
            <Icon name="players" size={14} />
            <span>Manage Players</span>
          </Link>
          <Link to="/admin/matches" className="btn-secondary btn-small">
            <Icon name="matches" size={14} />
            <span>Manage Matches</span>
          </Link>
          <Link to="/admin/users" className="btn-secondary btn-small">
            <Icon name="users" size={14} />
            <span>Manage User Accounts</span>
          </Link>
        </div>
      </div>
    </>
  );
}
