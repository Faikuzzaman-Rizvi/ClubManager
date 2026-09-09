import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';
import { imageEndpoints } from '../../api/images';
import PageHeader from '../../components/ui/PageHeader';
import EntityImage from '../../components/ui/EntityImage';
import ImageUpload from '../../components/ui/ImageUpload';
import Icon from '../../components/ui/Icon';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { formatMatchDay } from '../../helpers/datetime';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

export default function UserProfileAdminView() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    username: '',
    newPassword: '',
    teamId: '',
    playerName: '',
    position: '',
    jerseyNumber: '',
    age: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formNotice, setFormNotice] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, teamsRes] = await Promise.all([
          axiosClient.get(`/api/users/${userId}`),
          axiosClient.get('/api/teams'),
        ]);

        const u = userRes.data;
        setProfile(u);
        setTeams(teamsRes.data);
        setForm({
          username: u.username || '',
          newPassword: '',
          teamId: u.teamId != null ? String(u.teamId) : '',
          playerName: u.playerName || '',
          position: u.position || '',
          jerseyNumber: u.jerseyNumber != null ? String(u.jerseyNumber) : '',
          age: u.age != null ? String(u.age) : '',
        });
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load user profile.'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  async function handleSave(e) {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);

    const trimmedUsername = form.username.trim();
    if (trimmedUsername.length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }

    if (form.newPassword && form.newPassword.length < 6) {
      setFormError('New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: trimmedUsername,
        newPassword: form.newPassword || undefined,
        teamId: form.teamId ? Number(form.teamId) : undefined,
        playerName: form.playerName || undefined,
        position: form.position || undefined,
        jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : undefined,
        age: form.age ? Number(form.age) : undefined,
      };

      const res = await axiosClient.put(`/api/users/${userId}`, payload);
      setProfile(res.data);
      setFormNotice('User profile updated successfully.');
      setForm((prev) => ({
        ...prev,
        username: res.data.username,
        newPassword: '',
      }));
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Failed to update user profile.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={4} label="Loading user profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <ErrorState message={error} />
        <p style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/admin/users" className="btn-secondary btn-small">
            &larr; Back to User Accounts
          </Link>
        </p>
      </div>
    );
  }

  const role = profile.role;
  const isCoach = role === 'Coach';
  const isPlayer = role === 'Player';

  return (
    <>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <Link to="/admin/users" className="btn-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>&larr; Back to User Accounts</span>
        </Link>
      </div>

      <PageHeader
        title={`Profile: ${profile.username}`}
        subtitle={`Admin view: examine and update account credentials and role assignments for this ${role}.`}
      />

      <section className="profile-head">
        <EntityImage
          src={profile.avatarUrl}
          name={profile.username}
          variant="avatar"
          className="entity-image-2xl"
          eager
        />

        {isPlayer && profile.jerseyNumber && (
          <span className="jersey-badge jersey-badge-lg">
            {profile.jerseyNumber}
          </span>
        )}

        <div className="profile-identity">
          <h1>{profile.username}</h1>
          <p className="profile-meta">
            <span className={`badge badge-${role.toLowerCase()}`}>{role}</span>
            {profile.teamName && (
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
            {profile.createdAt && (
              <span>· Created on {formatMatchDay(profile.createdAt)}</span>
            )}
          </p>
        </div>

        <div className="profile-avatar-edit">
          <ImageUpload
            endpoint={imageEndpoints.userAvatar(userId)}
            value={profile.avatarUrl}
            name={profile.username}
            variant="avatar"
            label="User Picture"
            helpText="Update or remove avatar picture on this account."
            canRemove={Boolean(profile.hasOwnAvatar)}
            onChange={(url, { removed }) => {
              setProfile((prev) => ({
                ...prev,
                avatarUrl: url,
                hasOwnAvatar: !removed,
              }));
            }}
          />
        </div>
      </section>

      <div className="card profile-edit-card">
        <div className="section-title">
          <h2>Update User Details</h2>
        </div>

        {formError && <p className="error" role="alert">{formError}</p>}
        {formNotice && <p className="notice" role="status">{formNotice}</p>}

        <form onSubmit={handleSave}>
          <div className="profile-form-grid">
            <div className="profile-form-group">
              <label htmlFor="edit-username">Username</label>
              <input
                id="edit-username"
                type="text"
                autoComplete="off"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="edit-role">Assigned Role</label>
              <input
                id="edit-role"
                type="text"
                value={role}
                disabled
              />
            </div>

            {isCoach && (
              <div className="profile-form-group">
                <label htmlFor="edit-coach-team">Assigned Club / Team</label>
                <select
                  id="edit-coach-team"
                  value={form.teamId}
                  onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                  required
                >
                  <option value="">Select team...</option>
                  {teams.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isPlayer && (
              <>
                <div className="profile-form-group">
                  <label htmlFor="edit-player-name">Player Name</label>
                  <input
                    id="edit-player-name"
                    type="text"
                    value={form.playerName}
                    placeholder={profile.playerId ? 'Linked player name' : 'No player linked'}
                    disabled={!profile.playerId}
                    onChange={(e) => setForm({ ...form, playerName: e.target.value })}
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="edit-player-pos">Position</label>
                  <select
                    id="edit-player-pos"
                    value={form.position}
                    disabled={!profile.playerId}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  >
                    <option value="">Select position...</option>
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="profile-form-group">
                  <label htmlFor="edit-player-jersey">Jersey Number</label>
                  <input
                    id="edit-player-jersey"
                    type="number"
                    min="1"
                    max="99"
                    value={form.jerseyNumber}
                    disabled={!profile.playerId}
                    onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="edit-player-age">Age</label>
                  <input
                    id="edit-player-age"
                    type="number"
                    min="14"
                    max="50"
                    value={form.age}
                    disabled={!profile.playerId}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="profile-form-group">
              <label htmlFor="edit-reset-pass">Reset Password</label>
              <input
                id="edit-reset-pass"
                type="password"
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="profile-actions-row">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Icon name="check" size={15} />
              <span>{saving ? 'Saving changes...' : 'Save User Profile'}</span>
            </button>
            <Link to="/admin/users" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
