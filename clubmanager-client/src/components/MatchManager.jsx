import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { apiErrorMessage } from '../api/apiError';
import {
  formatMatchDate,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '../helpers/datetime';
import Pagination from './Pagination';
import EntityImage from './ui/EntityImage';
import { EmptyState, ErrorState, LoadingState } from './ui/States';
import Icon from './ui/Icon';

/**
 * Fixtures, results and goals. Admin and Coach see the same board; passing
 * `scopeTeamId` switches it to the Coach view, which lists only that team's
 * matches and can only schedule fixtures the team is playing in.
 *
 * The scope is a UX guard, not the security boundary - MatchService re-checks
 * the coach's team claim on every write, before and after the change.
 */

const PAGE_SIZE = 10;
const SCHEDULED = 'Scheduled';
const COMPLETED = 'Completed';

const EMPTY_GOAL = { playerId: '', minute: '' };

export default function MatchManager({ scopeTeamId = null }) {
  const isCoach = scopeTeamId != null;

  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const emptySchedule = {
    homeTeamId: isCoach ? String(scopeTeamId) : '',
    awayTeamId: '',
    matchDate: '',
  };

  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [notice, setNotice] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const [resultForm, setResultForm] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);

  // Goal panel: one match expanded at a time, loaded on demand.
  const [goalsMatchId, setGoalsMatchId] = useState(null);
  const [goalsPanel, setGoalsPanel] = useState({ loading: false, goals: [], squad: [], error: null });
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalError, setGoalError] = useState(null);

  // Identifies the newest goal-panel request. Opening one row's panel and then
  // another's before the first resolves would otherwise let the slower response
  // land last, showing one match's goals and squads under a different match.
  const goalsRequestRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const [matchList, teamList] = await Promise.all([
        axiosClient.get('/api/matches'),
        axiosClient.get('/api/teams'),
      ]);

      // /api/matches is unscoped by design (every role may read the whole
      // fixture list), so the coach view narrows it here.
      const visible = scopeTeamId == null
        ? matchList.data
        : matchList.data.filter(
            (m) => m.homeTeamId === scopeTeamId || m.awayTeamId === scopeTeamId,
          );

      setMatches(visible);
      setTeams(teamList.data);
      setLoadError(null);
    } catch (error) {
      setLoadError(apiErrorMessage(error, 'Could not load matches.'));
    } finally {
      setLoading(false);
    }
  }, [scopeTeamId]);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  /* ------------------------------------------------------------- scheduling */

  const coachIsHome = String(scheduleForm.homeTeamId) === String(scopeTeamId);
  const opponentId = coachIsHome ? scheduleForm.awayTeamId : scheduleForm.homeTeamId;

  function setCoachFixture(isHome, nextOpponentId) {
    setScheduleForm((form) => ({
      ...form,
      homeTeamId: isHome ? String(scopeTeamId) : nextOpponentId,
      awayTeamId: isHome ? nextOpponentId : String(scopeTeamId),
    }));
  }

  async function handleSchedule(event) {
    event.preventDefault();
    setScheduleError(null);
    setNotice(null);

    if (!scheduleForm.homeTeamId || !scheduleForm.awayTeamId) {
      setScheduleError(isCoach ? 'Pick an opponent.' : 'Pick both teams.');
      return;
    }

    if (scheduleForm.homeTeamId === scheduleForm.awayTeamId) {
      setScheduleError('A team cannot play itself.');
      return;
    }

    if (!scheduleForm.matchDate) {
      setScheduleError('Pick a kick-off date and time.');
      return;
    }

    setScheduling(true);

    try {
      await axiosClient.post('/api/matches', {
        homeTeamId: Number(scheduleForm.homeTeamId),
        awayTeamId: Number(scheduleForm.awayTeamId),
        matchDate: fromDateTimeLocalValue(scheduleForm.matchDate),
      });

      setScheduleForm(emptySchedule);
      setNotice('Match scheduled.');
      await load();
    } catch (error) {
      setScheduleError(apiErrorMessage(error, 'Could not schedule the match.'));
    } finally {
      setScheduling(false);
    }
  }

  /* ------------------------------------------------------ result entry/edit */

  function startEdit(match) {
    setEditingId(match.matchId);
    setResultForm({
      matchDate: toDateTimeLocalValue(match.matchDate),
      homeScore: match.homeScore ?? '',
      awayScore: match.awayScore ?? '',
      status: match.status,
    });
    setRowError(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setResultForm(null);
    setRowError(null);
  }

  /** Mirrors the API rule: a Completed match carries a result, a Scheduled one never does. */
  function changeStatus(status) {
    setResultForm((form) =>
      status === SCHEDULED
        ? { ...form, status, homeScore: '', awayScore: '' }
        : { ...form, status },
    );
  }

  async function handleSaveResult(match) {
    setRowError(null);
    setNotice(null);

    if (!resultForm.matchDate) {
      setRowError({ matchId: match.matchId, message: 'Kick-off date and time is required.' });
      return;
    }

    const completed = resultForm.status === COMPLETED;

    if (completed && (resultForm.homeScore === '' || resultForm.awayScore === '')) {
      setRowError({
        matchId: match.matchId,
        message: 'A completed match needs both scores. Enter them, or set the status back to Scheduled.',
      });
      return;
    }

    setBusyId(match.matchId);

    try {
      await axiosClient.put(`/api/matches/${match.matchId}`, {
        // Teams are fixed once a fixture exists: changing them here would let a
        // coach hand their own match to two other teams, which the API rejects.
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        matchDate: fromDateTimeLocalValue(resultForm.matchDate),
        homeScore: completed ? Number(resultForm.homeScore) : null,
        awayScore: completed ? Number(resultForm.awayScore) : null,
        status: resultForm.status,
      });

      setEditingId(null);
      setResultForm(null);
      setNotice(completed ? 'Result saved.' : 'Match updated.');
      await load();
    } catch (error) {
      setRowError({
        matchId: match.matchId,
        message: apiErrorMessage(error, 'Could not save the match.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  /* -------------------------------------------------------------- goals */

  const loadGoals = useCallback(async (match) => {
    const requestId = goalsRequestRef.current + 1;
    goalsRequestRef.current = requestId;
    setGoalsPanel({ loading: true, goals: [], squad: [], error: null });

    try {
      // Either side may score, so the picker needs both squads. A Coach is
      // allowed to read another team's squad through ?teamId=.
      const [detail, homeSquad, awaySquad] = await Promise.all([
        axiosClient.get(`/api/matches/${match.matchId}`),
        axiosClient.get('/api/players', { params: { teamId: match.homeTeamId } }),
        axiosClient.get('/api/players', { params: { teamId: match.awayTeamId } }),
      ]);

      if (goalsRequestRef.current !== requestId) {
        return;
      }

      setGoalsPanel({
        loading: false,
        goals: detail.data.goals,
        squad: [
          { teamName: match.homeTeamName, players: homeSquad.data },
          { teamName: match.awayTeamName, players: awaySquad.data },
        ],
        error: null,
      });
    } catch (error) {
      if (goalsRequestRef.current !== requestId) {
        return;
      }

      setGoalsPanel({
        loading: false,
        goals: [],
        squad: [],
        error: apiErrorMessage(error, 'Could not load the goals for this match.'),
      });
    }
  }, []);

  function toggleGoals(match) {
    setGoalForm(EMPTY_GOAL);
    setGoalError(null);
    setNotice(null);

    if (goalsMatchId === match.matchId) {
      setGoalsMatchId(null);
      return;
    }

    setGoalsMatchId(match.matchId);
    loadGoals(match);
  }

  async function handleAddGoal(event, match) {
    event.preventDefault();
    setGoalError(null);

    if (!goalForm.playerId) {
      setGoalError('Pick the scorer.');
      return;
    }

    if (goalForm.minute !== '' && (Number(goalForm.minute) < 0 || Number(goalForm.minute) > 130)) {
      setGoalError('Minute must be between 0 and 130.');
      return;
    }

    setAddingGoal(true);

    try {
      await axiosClient.post(`/api/matches/${match.matchId}/goals`, {
        playerId: Number(goalForm.playerId),
        minute: goalForm.minute === '' ? null : Number(goalForm.minute),
      });

      setGoalForm(EMPTY_GOAL);
      await loadGoals(match);
    } catch (error) {
      setGoalError(apiErrorMessage(error, 'Could not record the goal.'));
    } finally {
      setAddingGoal(false);
    }
  }

  /* ------------------------------------------------------ filter + paginate */

  const term = search.trim().toLowerCase();
  const filtered = matches.filter((match) => {
    if (statusFilter && match.status !== statusFilter) return false;

    if (teamFilter) {
      const id = Number(teamFilter);
      if (match.homeTeamId !== id && match.awayTeamId !== id) return false;
    }

    return (
      !term ||
      match.homeTeamName.toLowerCase().includes(term) ||
      match.awayTeamName.toLowerCase().includes(term)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  if (loading) {
    return <LoadingState rows={6} label="Loading matches" />;
  }

  const opponents = teams.filter((team) => team.teamId !== scopeTeamId);

  return (
    <>
      <form className="form-row" onSubmit={handleSchedule}>
        {isCoach ? (
          <>
            <div className="field">
              <label htmlFor="venue">Venue</label>
              <select
                id="venue"
                value={coachIsHome ? 'home' : 'away'}
                onChange={(e) => setCoachFixture(e.target.value === 'home', opponentId)}
              >
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="opponent">Opponent</label>
              <select
                id="opponent"
                value={opponentId}
                onChange={(e) => setCoachFixture(coachIsHome, e.target.value)}
              >
                <option value="">Select opponent...</option>
                {opponents.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="home-team">Home team</label>
              <select
                id="home-team"
                value={scheduleForm.homeTeamId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, homeTeamId: e.target.value })}
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
              <label htmlFor="away-team">Away team</label>
              <select
                id="away-team"
                value={scheduleForm.awayTeamId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, awayTeamId: e.target.value })}
              >
                <option value="">Select team...</option>
                {teams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="kickoff">Kick-off</label>
          <input
            id="kickoff"
            type="datetime-local"
            value={scheduleForm.matchDate}
            onChange={(e) => setScheduleForm({ ...scheduleForm, matchDate: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={scheduling}>
          <Icon name="calendar" size={15} />
          <span>{scheduling ? 'Scheduling...' : 'Schedule match'}</span>
        </button>
      </form>

      {scheduleError && (
        <p className="error" role="alert">
          {scheduleError}
        </p>
      )}

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <div className="filter-row">
        <label htmlFor="status-filter">
          <Icon name="filter" size={14} />
          <span>Status</span>
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => changeFilter(setStatusFilter, e.target.value)}
        >
          <option value="">All</option>
          <option value={SCHEDULED}>Scheduled</option>
          <option value={COMPLETED}>Completed</option>
        </select>

        {!isCoach && (
          <>
            <label htmlFor="match-team-filter">
              <Icon name="teams" size={14} />
              <span>Team</span>
            </label>
            <select
              id="match-team-filter"
              value={teamFilter}
              onChange={(e) => changeFilter(setTeamFilter, e.target.value)}
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {team.teamName}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="match-search">
          <Icon name="search" size={14} />
          <span>Search</span>
        </label>
        <input
          id="match-search"
          type="search"
          placeholder="Search team name..."
          value={search}
          onChange={(e) => changeFilter(setSearch, e.target.value)}
        />
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : matches.length === 0 ? (
        <EmptyState
          icon="⚔"
          title="No matches yet"
          message={
            isCoach
              ? 'Schedule your team’s first fixture using the form above.'
              : 'Schedule the first fixture using the form above.'
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="⚔"
          title="No matches match these filters"
          message="Try a different status or team, or clear the search."
        />
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kick-off</th>
                  <th>Home</th>
                  <th className="num">Score</th>
                  <th>Away</th>
                  <th>Status</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((match) => {
                  const isEditing = editingId === match.matchId;
                  const isBusy = busyId === match.matchId;
                  const goalsOpen = goalsMatchId === match.matchId;

                  return (
                    <Fragment key={match.matchId}>
                      <tr>
                        {isEditing ? (
                          <>
                            <td>
                              <input
                                aria-label="Kick-off"
                                type="datetime-local"
                                className="cell-input"
                                value={resultForm.matchDate}
                                onChange={(e) =>
                                  setResultForm({ ...resultForm, matchDate: e.target.value })
                                }
                              />
                            </td>
                            <td>{match.homeTeamName}</td>
                            <td className="num score-cell">
                              <input
                                aria-label="Home score"
                                type="number"
                                min="0"
                                max="99"
                                className="cell-input input-xs"
                                disabled={resultForm.status !== COMPLETED}
                                value={resultForm.homeScore}
                                onChange={(e) =>
                                  setResultForm({ ...resultForm, homeScore: e.target.value })
                                }
                              />
                              <span className="score-dash">-</span>
                              <input
                                aria-label="Away score"
                                type="number"
                                min="0"
                                max="99"
                                className="cell-input input-xs"
                                disabled={resultForm.status !== COMPLETED}
                                value={resultForm.awayScore}
                                onChange={(e) =>
                                  setResultForm({ ...resultForm, awayScore: e.target.value })
                                }
                              />
                            </td>
                            <td>{match.awayTeamName}</td>
                            <td>
                              <select
                                aria-label="Status"
                                className="cell-input"
                                value={resultForm.status}
                                onChange={(e) => changeStatus(e.target.value)}
                              >
                                <option value={SCHEDULED}>Scheduled</option>
                                <option value={COMPLETED}>Completed</option>
                              </select>
                            </td>
                            <td className="actions-col">
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-action btn-action-save"
                                onClick={() => handleSaveResult(match)}
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
                          <td>{formatMatchDate(match.matchDate)}</td>
                          <td>
                            <span className="team-cell">
                              <EntityImage
                                src={match.homeTeamLogoUrl}
                                name={match.homeTeamName}
                                variant="logo"
                                className="entity-image-sm"
                              />
                              <span>{match.homeTeamName}</span>
                            </span>
                          </td>
                          <td className="num strong">
                            {match.status === COMPLETED
                              ? `${match.homeScore} - ${match.awayScore}`
                              : <span className="muted">v</span>}
                          </td>
                          <td>
                            <span className="team-cell">
                              <EntityImage
                                src={match.awayTeamLogoUrl}
                                name={match.awayTeamName}
                                variant="logo"
                                className="entity-image-sm"
                              />
                              <span>{match.awayTeamName}</span>
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                match.status === COMPLETED
                                  ? 'pill pill-completed'
                                  : 'pill pill-scheduled'
                              }
                            >
                              {match.status}
                            </span>
                          </td>
                          <td className="actions-col">
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-action btn-action-edit"
                                onClick={() => startEdit(match)}
                                title={match.status === COMPLETED ? 'Edit result' : 'Enter result'}
                              >
                                <Icon name="edit" size={14} />
                                <span>{match.status === COMPLETED ? 'Edit' : 'Score'}</span>
                              </button>
                              <button
                                type="button"
                                className={`btn-action btn-action-goals ${goalsOpen ? 'is-active' : ''}`}
                                onClick={() => toggleGoals(match)}
                                title={goalsOpen ? 'Hide match goals' : 'View or record match goals'}
                              >
                                <Icon name="ball" size={14} />
                                <span>{goalsOpen ? 'Hide' : 'Goals'}</span>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      </tr>

                      {rowError?.matchId === match.matchId && (
                        <tr className="row-error">
                          <td colSpan={6} role="alert">
                            {rowError.message}
                          </td>
                        </tr>
                      )}

                      {goalsOpen && (
                        <tr className="panel-row">
                          <td colSpan={6}>
                            <GoalsPanel
                              match={match}
                              panel={goalsPanel}
                              form={goalForm}
                              onFormChange={setGoalForm}
                              onSubmit={(e) => handleAddGoal(e, match)}
                              submitting={addingGoal}
                              error={goalError}
                            />
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
            noun="matches"
          />
        </>
      )}
    </>
  );
}

function GoalsPanel({ match, panel, form, onFormChange, onSubmit, submitting, error }) {
  if (panel.loading) {
    return <p className="muted">Loading goals...</p>;
  }

  if (panel.error) {
    return (
      <p className="error" role="alert">
        {panel.error}
      </p>
    );
  }

  const hasSquad = panel.squad.some((group) => group.players.length > 0);

  return (
    <div className="panel">
      <h3>
        Goals - {match.homeTeamName} v {match.awayTeamName}
      </h3>

      {panel.goals.length === 0 ? (
        <p className="muted">No goals recorded for this match.</p>
      ) : (
        <ul className="goal-list">
          {panel.goals.map((goal) => (
            <li key={goal.goalId}>
              <span className="goal-minute">{goal.minute != null ? `${goal.minute}'` : '-'}</span>
              <EntityImage
                src={goal.playerImageUrl}
                name={goal.playerName}
                variant="avatar"
                className="entity-image-xs"
              />
              <span className="strong">{goal.playerName}</span>
              <span className="muted">{goal.teamName}</span>
            </li>
          ))}
        </ul>
      )}

      {hasSquad ? (
        <form className="form-row form-row-flush" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor={`scorer-${match.matchId}`}>Scorer</label>
            <select
              id={`scorer-${match.matchId}`}
              value={form.playerId}
              onChange={(e) => onFormChange({ ...form, playerId: e.target.value })}
            >
              <option value="">Select player...</option>
              {panel.squad.map((group) => (
                <optgroup key={group.teamName} label={group.teamName}>
                  {group.players.map((player) => (
                    <option key={player.playerId} value={player.playerId}>
                      {player.jerseyNumber != null ? `${player.jerseyNumber}. ` : ''}
                      {player.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor={`minute-${match.matchId}`}>Minute (optional)</label>
            <input
              id={`minute-${match.matchId}`}
              type="number"
              min="0"
              max="130"
              className="input-xs"
              value={form.minute}
              onChange={(e) => onFormChange({ ...form, minute: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary btn-small" disabled={submitting}>
            <Icon name="ball" size={14} />
            <span>{submitting ? 'Recording...' : 'Record goal'}</span>
          </button>
        </form>
      ) : (
        <p className="muted">
          Neither squad has any players yet, so there is nobody to credit a goal to.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
