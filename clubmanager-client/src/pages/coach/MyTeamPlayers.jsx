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
import { useAuth } from '../../context/useAuth';
import Icon from '../../components/ui/Icon';

const PAGE_SIZE = 10;
const EMPTY_FORM = { name: '', position: '', jerseyNumber: '', age: '' };

export default function MyTeamPlayers() {
  const { user } = useAuth();
  const teamId = user?.teamId ?? null;

  const [players, setPlayers] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    if (teamId == null) {
      setLoading(false);
      return;
    }

    try {
      // Unfiltered GET already resolves to the coach's own squad from the JWT
      // claim, so there is no team id to get wrong here.
      const [squad, team] = await Promise.all([
        axiosClient.get('/api/players'),
        axiosClient.get(`/api/teams/${teamId}`),
      ]);

      setPlayers(squad.data);
      setTeamName(team.data.teamName);
      setLoadError(null);
    } catch (error) {
      setLoadError(apiErrorMessage(error, 'Could not load your squad.'));
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  /**
   * The API replaces the whole player record, so `userId` has to be sent back
   * verbatim - omitting it would silently unlink the player's login. A coach
   * cannot read /api/users, so the link is carried through, never edited.
   */
  function toPayload(form, currentUserId) {
    return {
      teamId,
      name: form.name.trim(),
      position: form.position.trim() || null,
      jerseyNumber: form.jerseyNumber === '' ? null : Number(form.jerseyNumber),
      age: form.age === '' ? null : Number(form.age),
      userId: currentUserId ?? null,
    };
  }

  function validate(form) {
    if (form.name.trim().length < 2) {
      return 'Name must be at least 2 characters.';
    }

    if (form.jerseyNumber !== '' && (Number(form.jerseyNumber) < 1 || Number(form.jerseyNumber) > 99)) {
      return 'Jersey number must be between 1 and 99.';
    }

    if (form.age !== '' && (Number(form.age) < 14 || Number(form.age) > 70)) {
      return 'Age must be between 14 and 70.';
    }

    return null;
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
    setNotice(null);

    const invalid = validate(createForm);
    if (invalid) {
      setCreateError(invalid);
      return;
    }

    setCreating(true);

    try {
      await axiosClient.post('/api/players', toPayload(createForm, null));
      setCreateForm(EMPTY_FORM);
      setNotice('Player added to the squad.');
      await load();
    } catch (error) {
      setCreateError(apiErrorMessage(error, 'Could not add the player.'));
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
    });
    setRowError(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowError(null);
  }

  async function handleSave(player) {
    setRowError(null);
    setNotice(null);

    const invalid = validate(editForm);
    if (invalid) {
      setRowError({ playerId: player.playerId, message: invalid });
      return;
    }

    setBusyId(player.playerId);

    try {
      await axiosClient.put(`/api/players/${player.playerId}`, toPayload(editForm, player.userId));
      setEditingId(null);
      setNotice('Player updated.');
      await load();
    } catch (error) {
      setRowError({
        playerId: player.playerId,
        message: apiErrorMessage(error, 'Could not save the player.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const player = pendingDelete;
    setRowError(null);
    setNotice(null);
    setBusyId(player.playerId);

    try {
      await axiosClient.delete(`/api/players/${player.playerId}`);
      setPendingDelete(null);
      setNotice('Player removed.');
      await load();
    } catch (error) {
      // A 409 carries the API's own reason (goals recorded against them).
      setPendingDelete(null);
      setRowError({
        playerId: player.playerId,
        message: apiErrorMessage(error, 'Could not remove the player.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  if (teamId == null) {
    return (
      <div className="card">
        <h1>My Squad</h1>
        <p className="error" role="alert">
          This coach account is not linked to a team, so there is no squad to manage. Ask an admin
          to assign one.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={6} label="Loading your squad" />
      </div>
    );
  }

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
        title={`My Squad${teamName ? ` - ${teamName}` : ''}`}
        subtitle="Your own team only. Transfers between teams and login links are handled by an admin."
        actions={<span className="badge badge-coach">{teamName || 'My team'}</span>}
      />

      <div className="card">
      <form className="form-row" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="squad-name">Name</label>
          <input
            id="squad-name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="squad-position">Position</label>
          <input
            id="squad-position"
            value={createForm.position}
            onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="squad-jersey">Jersey #</label>
          <input
            id="squad-jersey"
            type="number"
            min="1"
            max="99"
            className="input-xs"
            value={createForm.jerseyNumber}
            onChange={(e) => setCreateForm({ ...createForm, jerseyNumber: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="squad-age">Age</label>
          <input
            id="squad-age"
            type="number"
            min="14"
            max="70"
            className="input-xs"
            value={createForm.age}
            onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={creating}>
          <Icon name="plus" size={15} />
          <span>{creating ? 'Adding...' : 'Add player'}</span>
        </button>
      </form>

      {createError && (
        <p className="error" role="alert">
          {createError}
        </p>
      )}

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <div className="filter-row">
        <label htmlFor="squad-search">
          <Icon name="search" size={14} />
          <span>Search</span>
        </label>
        <input
          id="squad-search"
          type="search"
          placeholder="Filter squad by name or position..."
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
          title={players.length === 0 ? 'No players in your squad yet' : 'No players match that search'}
          message={
            players.length === 0
              ? 'Add your first player using the form above.'
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
                                min="1"
                                max="99"
                                className="cell-input input-xs"
                                value={editForm.jerseyNumber}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, jerseyNumber: e.target.value })
                                }
                              />
                            </td>
                            <td className="crest-col">
                              {/* Saves on its own the moment a file is chosen -
                                  it is not part of the row's Save, so cancelling
                                  an edit does not undo it. */}
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
                              <input
                                aria-label="Age"
                                type="number"
                                min="14"
                                max="70"
                                className="cell-input input-xs"
                                value={editForm.age}
                                onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                              />
                            </td>
                            <td>
                              {player.userId != null ? (
                                <span className="pill pill-completed">Linked</span>
                              ) : (
                                <span className="muted">-</span>
                              )}
                            </td>
                            <td className="actions-col">
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-action btn-action-save"
                                onClick={() => handleSave(player)}
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
                          <td className="num">{player.age ?? <span className="muted">-</span>}</td>
                          <td>
                            {player.userId != null ? (
                              <span className="pill pill-completed">Linked</span>
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
                                title="Edit Squad Player"
                              >
                                <Icon name="edit" size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-action btn-action-delete"
                                onClick={() => setPendingDelete(player)}
                                disabled={isBusy}
                                title="Remove Player"
                              >
                                <Icon name="trash" size={14} />
                                <span>{isBusy ? '...' : 'Remove'}</span>
                              </button>
                            </div>
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
        title="Remove player"
        message={`Remove ${pendingDelete?.name} from the squad? This cannot be undone, and is refused while goals are recorded against them.`}
        confirmLabel="Remove player"
        busy={busyId === pendingDelete?.playerId}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
