import { Fragment, useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { apiErrorMessage } from '../../api/apiError';

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

  async function handleDelete(team) {
    // Destructive and not undoable, so confirm before firing.
    if (!window.confirm(`Delete ${team.teamName}?`)) {
      return;
    }

    setRowError(null);
    setBusyId(team.teamId);

    try {
      await axiosClient.delete(`/api/teams/${team.teamId}`);
      await load();
    } catch (error) {
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
    return <p className="muted">Loading teams...</p>;
  }

  return (
    <div className="card">
      <h1>Teams</h1>
      <p className="muted">Admin only. Coaches and players can read this list but not change it.</p>

      <form className="form-row" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="new-team-name">Team name</label>
          <input
            id="new-team-name"
            value={createForm.teamName}
            onChange={(e) => setCreateForm({ ...createForm, teamName: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="new-team-city">City (optional)</label>
          <input
            id="new-team-city"
            value={createForm.city}
            onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? 'Creating...' : 'Create team'}
        </button>
      </form>

      {createError && (
        <p className="error" role="alert">
          {createError}
        </p>
      )}

      {loadError ? (
        <p className="error" role="alert">
          {loadError}
        </p>
      ) : teams.length === 0 ? (
        <p className="muted">No teams yet. Create the first one above.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
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
                            <button
                              type="button"
                              className="btn-primary btn-small"
                              onClick={() => handleSave(team.teamId)}
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
                          <td>{team.teamName}</td>
                          <td>{team.city ?? <span className="muted">-</span>}</td>
                          <td className="actions-col">
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => startEdit(team)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-link btn-danger"
                              onClick={() => handleDelete(team)}
                              disabled={isBusy}
                            >
                              {isBusy ? 'Working...' : 'Delete'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>

                    {rowError?.teamId === team.teamId && (
                      <tr className="row-error">
                        <td colSpan={3} role="alert">
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
