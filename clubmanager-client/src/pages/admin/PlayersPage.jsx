import { Fragment, useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';

const EMPTY_FORM = { name: '', position: '', jerseyNumber: '', age: '', teamId: '', userId: '' };

/**
 * Trims text, turns '' into null for the optional fields, and sends an unset
 * team as 0 so the server answers with its own "Team 0 was not found" rather
 * than a model-binding error.
 */
function toPayload(form) {
  return {
    teamId: form.teamId === '' ? 0 : Number(form.teamId),
    name: form.name.trim(),
    position: form.position.trim() || null,
    jerseyNumber: form.jerseyNumber === '' ? null : Number(form.jerseyNumber),
    age: form.age === '' ? null : Number(form.age),
    userId: form.userId === '' ? null : Number(form.userId),
  };
}

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  // Login links across ALL players, so the pickers stay right under a team filter.
  const [linkedUserIds, setLinkedUserIds] = useState(new Set());

  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [allPlayers, teamList, userList] = await Promise.all([
        axiosClient.get('/api/players'),
        axiosClient.get('/api/teams'),
        axiosClient.get('/api/users'),
      ]);

      // The table honours the server-side filter; the unfiltered list feeds
      // the link pickers, which must see every claimed login club-wide.
      const table = teamFilter
        ? (await axiosClient.get('/api/players', { params: { teamId: teamFilter } })).data
        : allPlayers.data;

      setLinkedUserIds(
        new Set(allPlayers.data.filter((p) => p.userId != null).map((p) => p.userId)),
      );
      setPlayers(table);
      setTeams(teamList.data);
      setUsers(userList.data);
      setLoadError(null);
    } catch (error) {
      setLoadError(apiErrorMessage(error, 'Could not load players.'));
    } finally {
      setLoading(false);
    }
  }, [teamFilter]);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  const usernameById = new Map(users.map((u) => [u.userId, u.username]));

  /** Player-role logins not yet claimed by any player, plus the row's own. */
  function linkOptions(currentUserId) {
    return users.filter(
      (u) =>
        u.role === 'Player' && (!linkedUserIds.has(u.userId) || u.userId === currentUserId),
    );
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      await axiosClient.post('/api/players', toPayload(createForm));
      setCreateForm(EMPTY_FORM);
      await load();
    } catch (error) {
      setCreateError(apiErrorMessage(error, 'Could not create the player.'));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(player) {
    setEditingId(player.playerId);
    setEditForm({
      name: player.name,
      position: player.position ?? '',
      jerseyNumber: player.jerseyNumber ?? '',
      age: player.age ?? '',
      teamId: String(player.teamId),
      userId: player.userId != null ? String(player.userId) : '',
    });
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowError(null);
  }

  async function handleSave(playerId) {
    setRowError(null);
    setBusyId(playerId);

    try {
      await axiosClient.put(`/api/players/${playerId}`, toPayload(editForm));
      setEditingId(null);
      await load();
    } catch (error) {
      setRowError({ playerId, message: apiErrorMessage(error, 'Could not save the player.') });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(player) {
    if (!window.confirm(`Delete ${player.name}?`)) {
      return;
    }

    setRowError(null);
    setBusyId(player.playerId);

    try {
      await axiosClient.delete(`/api/players/${player.playerId}`);
      await load();
    } catch (error) {
      // A 409 carries the API's own reason (recorded goals) - show it verbatim.
      setRowError({
        playerId: player.playerId,
        message: apiErrorMessage(error, 'Could not delete the player.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="muted">Loading players...</p>;
  }

  return (
    <div className="card">
      <h1>Players</h1>
      <p className="muted">
        Every squad in the club. Coaches manage their own team from their own screen.
      </p>

      <form className="form-row" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="new-name">Name</label>
          <input
            id="new-name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="new-position">Position</label>
          <input
            id="new-position"
            value={createForm.position}
            onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="new-jersey">Jersey #</label>
          <input
            id="new-jersey"
            type="number"
            className="input-xs"
            value={createForm.jerseyNumber}
            onChange={(e) => setCreateForm({ ...createForm, jerseyNumber: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="new-age">Age</label>
          <input
            id="new-age"
            type="number"
            className="input-xs"
            value={createForm.age}
            onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="new-team">Team</label>
          <select
            id="new-team"
            value={createForm.teamId}
            onChange={(e) => setCreateForm({ ...createForm, teamId: e.target.value })}
          >
            <option value="">Select team...</option>
            {teams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="new-user">Link login (optional)</label>
          <select
            id="new-user"
            value={createForm.userId}
            onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
          >
            <option value="">No account</option>
            {linkOptions(null).map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.username}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? 'Creating...' : 'Add player'}
        </button>
      </form>

      {createError && (
        <p className="error" role="alert">
          {createError}
        </p>
      )}

      <div className="filter-row">
        <label htmlFor="team-filter">Show</label>
        <select
          id="team-filter"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
        >
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>
      </div>

      {loadError ? (
        <p className="error" role="alert">
          {loadError}
        </p>
      ) : players.length === 0 ? (
        <p className="muted">No players here yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="pos-cell">#</th>
                <th>Name</th>
                <th>Position</th>
                <th>Team</th>
                <th className="num">Age</th>
                <th>Account</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const isEditing = editingId === player.playerId;
                const isBusy = busyId === player.playerId;

                return (
                  <Fragment key={player.playerId}>
                    <tr>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              aria-label="Jersey number"
                              type="number"
                              className="cell-input input-xs"
                              value={editForm.jerseyNumber}
                              onChange={(e) =>
                                setEditForm({ ...editForm, jerseyNumber: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              aria-label="Name"
                              className="cell-input"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              aria-label="Position"
                              className="cell-input"
                              value={editForm.position}
                              onChange={(e) =>
                                setEditForm({ ...editForm, position: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <select
                              aria-label="Team"
                              className="cell-input"
                              value={editForm.teamId}
                              onChange={(e) =>
                                setEditForm({ ...editForm, teamId: e.target.value })
                              }
                            >
                              {teams.map((team) => (
                                <option key={team.teamId} value={team.teamId}>
                                  {team.teamName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              aria-label="Age"
                              type="number"
                              className="cell-input input-xs"
                              value={editForm.age}
                              onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              aria-label="Linked login"
                              className="cell-input"
                              value={editForm.userId}
                              onChange={(e) =>
                                setEditForm({ ...editForm, userId: e.target.value })
                              }
                            >
                              <option value="">No account</option>
                              {linkOptions(player.userId).map((u) => (
                                <option key={u.userId} value={u.userId}>
                                  {u.username}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="actions-col">
                            <button
                              type="button"
                              className="btn-primary btn-small"
                              onClick={() => handleSave(player.playerId)}
                              disabled={isBusy}
                            >
                              {isBusy ? 'Saving...' : 'Save'}
                            </button>
                            <button type="button" className="btn-link" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="pos-cell">
                            {player.jerseyNumber != null ? (
                              <span className="jersey-badge">{player.jerseyNumber}</span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td>{player.name}</td>
                          <td>{player.position ?? <span className="muted">-</span>}</td>
                          <td>{player.teamName}</td>
                          <td className="num">
                            {player.age ?? <span className="muted">-</span>}
                          </td>
                          <td>
                            {player.userId != null ? (
                              <span className="pill pill-completed">
                                {usernameById.get(player.userId) ?? 'Linked'}
                              </span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td className="actions-col">
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => startEdit(player)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-link btn-danger"
                              onClick={() => handleDelete(player)}
                              disabled={isBusy}
                            >
                              {isBusy ? 'Working...' : 'Delete'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>

                    {rowError?.playerId === player.playerId && (
                      <tr className="row-error">
                        <td colSpan={7} role="alert">
                          {rowError.message}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
