import { Fragment, useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';
import PageHeader from '../../components/ui/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EntityImage from '../../components/ui/EntityImage';
import ImageUpload from '../../components/ui/ImageUpload';
import { imageEndpoints } from '../../api/images';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import Icon from '../../components/ui/Icon';

const EMPTY_FORM = { teamName: '', city: '' };

/** Trims, and sends an omitted city as null so the API stores NULL rather than ''. */
function toPayload(form) {
  return {
    teamName: form.teamName.trim(),
    city: form.city.trim() || null,
  };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [busyId, setBusyId] = useState(null);

  // Errors raised by a row's own save/delete, shown under that row.
  const [rowError, setRowError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Every setState here runs after an await, so this stays safe to call
  // straight from an effect.
  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/api/teams');
      setTeams(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(apiErrorMessage(error, 'Could not load teams.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState, so
    // nothing here updates state synchronously during the effect.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  /*
   * Folds a crest change into the loaded list. The upload has already been
   * stored by the time this runs, so this is a local sync rather than a save -
   * which is what keeps the table from having to reload after every image.
   */
  function applyLogo(teamId, logoUrl) {
    setTeams((current) =>
      current.map((team) => (team.teamId === teamId ? { ...team, logoUrl } : team)),
    );
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      await axiosClient.post('/api/teams', toPayload(createForm));
      setCreateForm(EMPTY_FORM);
      await load();
    } catch (error) {
      setCreateError(apiErrorMessage(error, 'Could not create the team.'));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(team) {
    setEditingId(team.teamId);
    setEditForm({ teamName: team.teamName, city: team.city ?? '' });
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowError(null);
  }

  async function handleSave(teamId) {
    setRowError(null);
    setBusyId(teamId);

    try {
      await axiosClient.put(`/api/teams/${teamId}`, toPayload(editForm));
      setEditingId(null);
      await load();
    } catch (error) {
      setRowError({ teamId, message: apiErrorMessage(error, 'Could not save the team.') });
    } finally {
      setBusyId(null);
    }
  }

  // Destructive and not undoable, so it goes through a confirmation dialog.
  async function confirmDelete() {
    const team = pendingDelete;
    setRowError(null);
    setBusyId(team.teamId);

    try {
      await axiosClient.delete(`/api/teams/${team.teamId}`);
      setPendingDelete(null);
      await load();
    } catch (error) {
      setPendingDelete(null);
      // A 409 here carries the API's own explanation of what still references
      // the team - show that rather than a generic failure message.
      setRowError({
        teamId: team.teamId,
        message: apiErrorMessage(error, 'Could not delete the team.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={5} label="Loading teams" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle="Admin only. Coaches and players can read this list but not change it."
      />

      <div className="card">
      <form className="form-row" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="new-team-name">Team name</label>
          <input
            id="new-team-name"
            value={createForm.teamName}
            onChange={(e) => setCreateForm({ ...createForm, teamName: e.target.value })}
            placeholder="e.g. Real Madrid"
          />
        </div>

        <div className="field">
          <label htmlFor="new-team-city">City (optional)</label>
          <input
            id="new-team-city"
            value={createForm.city}
            onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
            placeholder="e.g. Madrid"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={creating}>
          <Icon name="plus" size={15} />
          <span>{creating ? 'Creating...' : 'Create team'}</span>
        </button>
      </form>

      {createError && (
        <p className="error" role="alert">
          {createError}
        </p>
      )}

      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon="⬢"
          title="No teams yet"
          message="Create the first team above to start building the competition."
        />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="crest-col">Crest</th>
                <th>Team</th>
                <th>City</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const isEditing = editingId === team.teamId;
                const isBusy = busyId === team.teamId;

                return (
                  <Fragment key={team.teamId}>
                    <tr>
                      {isEditing ? (
                        <>
                          <td className="crest-col">
                            {/* The crest saves on its own the moment it is
                                chosen - it is not part of the row's Save, so
                                cancelling an edit does not undo it. */}
                            <ImageUpload
                              endpoint={imageEndpoints.teamLogo(team.teamId)}
                              value={team.logoUrl}
                              name={team.teamName}
                              variant="logo"
                              helpText="Saved immediately."
                              onChange={(logoUrl) => applyLogo(team.teamId, logoUrl)}
                            />
                          </td>
                          <td>
                            <input
                              aria-label="Team name"
                              className="cell-input"
                              value={editForm.teamName}
                              onChange={(e) =>
                                setEditForm({ ...editForm, teamName: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              aria-label="City"
                              className="cell-input"
                              value={editForm.city}
                              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            />
                          </td>
                          <td className="actions-col">
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-action btn-action-save"
                                onClick={() => handleSave(team.teamId)}
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
                          <td className="crest-col">
                            <EntityImage
                              src={team.logoUrl}
                              name={team.teamName}
                              variant="logo"
                              className="entity-image-lg"
                            />
                          </td>
                          <td className="table-id">{team.teamName}</td>
                          <td>{team.city ?? <span className="muted">-</span>}</td>
                          <td className="actions-col">
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-action btn-action-edit"
                                onClick={() => startEdit(team)}
                                title="Edit Team"
                              >
                                <Icon name="edit" size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-action btn-action-delete"
                                onClick={() => setPendingDelete(team)}
                                disabled={isBusy}
                                title="Delete Team"
                              >
                                <Icon name="trash" size={14} />
                                <span>{isBusy ? '...' : 'Delete'}</span>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>

                    {rowError?.teamId === team.teamId && (
                      <tr className="row-error">
                        <td colSpan={4} role="alert">
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

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete team"
        message={`Delete ${pendingDelete?.teamName}? This cannot be undone, and is refused while players, coaches or matches still reference the team.`}
        confirmLabel="Delete team"
        busy={busyId === pendingDelete?.teamId}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
