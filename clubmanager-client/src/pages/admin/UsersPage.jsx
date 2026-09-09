import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import EntityImage from '../../components/ui/EntityImage';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import Icon from '../../components/ui/Icon';

const PAGE_SIZE = 10;
const EMPTY_FORM = { username: '', password: '', role: 'Coach', teamId: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [creating, setCreating] = useState(false);

  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const [userList, teamList] = await Promise.all([
        axiosClient.get('/api/users'),
        axiosClient.get('/api/teams'),
      ]);

      setUsers(userList.data);
      setTeams(teamList.data);
      setLoadError(null);
    } catch (error) {
      setLoadError(apiErrorMessage(error, 'Could not load user accounts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  /** Switching to Player drops the team, which the API rejects for that role. */
  function changeRole(role) {
    setForm((current) => ({ ...current, role, teamId: role === 'Coach' ? current.teamId : '' }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const username = form.username.trim();

    // Mirrors RegisterRequest's data annotations so an obvious slip does not
    // need a round trip; the API validates the same rules regardless.
    if (username.length < 3 || username.length > 50) {
      setFormError('Username must be between 3 and 50 characters.');
      return;
    }

    if (form.password.length < 6 || form.password.length > 100) {
      setFormError('Password must be between 6 and 100 characters.');
      return;
    }

    if (form.role === 'Coach' && !form.teamId) {
      setFormError('A Coach must be assigned a team.');
      return;
    }

    setCreating(true);

    try {
      const { data } = await axiosClient.post('/api/auth/register', {
        username,
        password: form.password,
        role: form.role,
        teamId: form.role === 'Coach' ? Number(form.teamId) : null,
      });

      setForm(EMPTY_FORM);
      setNotice(`Created ${data.role} account "${data.username}".`);
      await load();
    } catch (error) {
      setFormError(apiErrorMessage(error, 'Could not create the account.'));
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={5} label="Loading user accounts" />
      </div>
    );
  }

  const teamNameById = new Map(teams.map((team) => [team.teamId, team.teamName]));

  const term = search.trim().toLowerCase();
  const filtered = users.filter(
    (user) =>
      (!roleFilter || user.role === roleFilter) &&
      (!term || user.username.toLowerCase().includes(term)),
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="User accounts"
        subtitle="Admin only. This creates Coach and Player logins - Admin accounts are seeded by script and cannot be made here."
      />

      <div className="card">
      <form className="form-row" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="new-username">Username</label>
          <input
            id="new-username"
            autoComplete="off"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="new-password">Password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="new-role">Role</label>
          <select id="new-role" value={form.role} onChange={(e) => changeRole(e.target.value)}>
            <option value="Coach">Coach</option>
            <option value="Player">Player</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="new-user-team">Team</label>
          <select
            id="new-user-team"
            value={form.teamId}
            disabled={form.role !== 'Coach'}
            onChange={(e) => setForm({ ...form, teamId: e.target.value })}
          >
            <option value="">{form.role === 'Coach' ? 'Select team...' : 'Coach only'}</option>
            {teams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary" disabled={creating}>
          <Icon name="plus" size={15} />
          <span>{creating ? 'Creating...' : 'Create account'}</span>
        </button>
      </form>

      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <p className="hint">
        A Player login only reaches their own profile once an admin links it to a player record on
        the Players screen.
      </p>

      <div className="filter-row">
        <label htmlFor="role-filter">
          <Icon name="filter" size={14} />
          <span>Role</span>
        </label>
        <select
          id="role-filter"
          value={roleFilter}
          onChange={(e) => changeFilter(setRoleFilter, e.target.value)}
        >
          <option value="">All roles</option>
          <option value="Admin">Admin</option>
          <option value="Coach">Coach</option>
          <option value="Player">Player</option>
        </select>

        <label htmlFor="user-search">
          <Icon name="search" size={14} />
          <span>Search</span>
        </label>
        <input
          id="user-search"
          type="search"
          placeholder="Filter by username..."
          value={search}
          onChange={(e) => changeFilter(setSearch, e.target.value)}
        />
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="⚿"
          title={users.length === 0 ? 'No accounts yet' : 'No accounts match these filters'}
          message={
            users.length === 0
              ? 'Create a Coach or Player login using the form above.'
              : 'Try a different role or clear the search.'
          }
        />
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user.userId}>
                    <td className="table-id">
                      <span className="team-cell">
                        <EntityImage
                          src={user.avatarUrl}
                          name={user.username}
                          variant="avatar"
                          className="entity-image-sm"
                        />
                        <span>{user.username}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span>
                    </td>
                    <td>
                      {user.teamId != null ? (
                        (teamNameById.get(user.teamId) ?? `Team ${user.teamId}`)
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
            noun="accounts"
          />
        </>
      )}
      </div>
    </>
  );
}
