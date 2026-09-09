import { Fragment, useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EntityImage from '../../components/ui/EntityImage';
import ImageUpload from '../../components/ui/ImageUpload';
import { imageEndpoints } from '../../api/images';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import Icon from '../../components/ui/Icon';

const PAGE_SIZE = 10;
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

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

  /*
   * Folds a photo change into the loaded list. The upload is already stored by
   * the time this runs, so this is a local sync rather than a save - which is
   * what keeps the table from reloading after every image.
   */
  function applyPhoto(playerId, imageUrl) {
    setPlayers((current) =>
      current.map((player) => (player.playerId === playerId ? { ...player, imageUrl } : player)),
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

  async function confirmDelete() {
    const player = pendingDelete;
    setRowError(null);
    setBusyId(player.playerId);

    try {
      await axiosClient.delete(`/api/players/${player.playerId}`);
      setPendingDelete(null);
      await load();
    } catch (error) {
      // A 409 carries the API's own reason (recorded goals) - show it verbatim.
      setPendingDelete(null);
      setRowError({
        playerId: player.playerId,
        message: apiErrorMessage(error, 'Could not delete the player.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={6} label="Loading players" />
      </div>
    );
  }

  // The team filter is applied by the API; name/position search and paging are
  // client-side, since the list endpoint offers neither.
  const term = search.trim().toLowerCase();
  const filtered = players.filter(
    (player) =>
      !term ||
      player.name.toLowerCase().includes(term) ||
      (player.position ?? '').toLowerCase().includes(term),
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Players"
        subtitle="Every squad in the club. Coaches manage their own team from their own screen."
      />

      <div className="card">
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
          <Icon name="plus" size={15} />
          <span>{creating ? 'Creating...' : 'Add player'}</span>
        </button>
      </form>

      {createError && (
        <p className="error" role="alert">
          {createError}
        </p>
      )}

      <div className="filter-row">
        <label htmlFor="team-filter">
          <Icon name="filter" size={14} />
          <span>Team</span>
        </label>
        <select
          id="team-filter"
          value={teamFilter}
          onChange={(e) => {
            setTeamFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>

        <label htmlFor="player-search">
          <Icon name="search" size={14} />
          <span>Search</span>
        </label>
        <input
          id="player-search"
          type="search"
          placeholder="Filter by name or position..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="⚉"
          title={players.length === 0 ? 'No players here yet' : 'No matches for that search'}
          message={
            players.length === 0
              ? 'Add a player above, or pick a different team from the filter.'
              : 'Try a different name or position, or clear the search.'
          }
        />
      ) : (
        <>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="pos-cell">#</th>
                <th className="crest-col">Photo</th>
                <th>Name</th>
                <th>Position</th>
                <th>Team</th>
                <th className="num">Age</th>
                <th>Account</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((player) => {
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
                          <td className="crest-col">
                            {/* Saves on its own the moment a file is chosen - it
                                is not part of the row's Save, so cancelling an
                                edit does not undo it. */}
                            <ImageUpload
                              endpoint={imageEndpoints.playerImage(player.playerId)}
                              value={player.imageUrl}
                              name={player.name}
                              variant="avatar"
                              helpText="Saved immediately."
                              onChange={(imageUrl) => applyPhoto(player.playerId, imageUrl)}
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
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-action btn-action-save"
                                onClick={() => handleSave(player.playerId)}
                                disabled={isBusy}
                              >
                                <Icon name="check" size={14} />
                                <span>{isBusy ? 'Saving...' : 'Save'}</span>
                              </button>
                              <button type="button" className="btn-action btn-action-cancel" onClick={cancelEdit}>
                                <span>Cancel</span>
                              </button>
                            </div>
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
                          <td className="crest-col">
                            <EntityImage
                              src={player.imageUrl}
                              name={player.name}
                              variant="avatar"
                              className="entity-image-lg"
                            />
                          </td>
                          <td className="table-id">{player.name}</td>
                          <td>{player.position ?? <span className="muted">-</span>}</td>
                          <td>
                            <span className="team-cell">
                              <EntityImage
                                src={player.teamLogoUrl}
                                name={player.teamName}
                                variant="logo"
                                className="entity-image-xs"
                              />
                              <span>{player.teamName}</span>
                            </span>
                          </td>
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
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-action btn-action-edit"
                                onClick={() => startEdit(player)}
                                title="Edit Player"
                              >
                                <Icon name="edit" size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-action btn-action-delete"
                                onClick={() => setPendingDelete(player)}
                                disabled={isBusy}
                                title="Delete Player"
                              >
                                <Icon name="trash" size={14} />
                                <span>{isBusy ? '...' : 'Delete'}</span>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>

                    {rowError?.playerId === player.playerId && (
                      <tr className="row-error">
                        <td colSpan={8} role="alert">
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

        <Pagination
          page={safePage}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
          noun="players"
        />
        </>
      )}
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete player"
        message={`Delete ${pendingDelete?.name}? This cannot be undone, and is refused while goals are recorded against them.`}
        confirmLabel="Delete player"
        busy={busyId === pendingDelete?.playerId}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
