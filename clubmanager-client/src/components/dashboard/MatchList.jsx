import EntityImage from '../ui/EntityImage';
import { formatMatchDate } from '../../helpers/datetime';

/**
 * Full-width fixture and result table. `highlightTeamId` highlights the viewer's own team
 * so a coach or team member can scan their fixtures immediately.
 */
export default function MatchList({ matches, highlightTeamId = null }) {
  if (!matches || matches.length === 0) return null;

  return (
    <div className="table-scroll">
      <table className="dash-table match-table">
        <thead>
          <tr>
            <th className="match-col-date">Date & Time</th>
            <th className="match-col-home">Home Team</th>
            <th className="match-col-score">Score</th>
            <th className="match-col-away">Away Team</th>
            <th className="match-col-status">Status</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const completed = match.status === 'Completed';
            const homeWin = completed && match.homeScore > match.awayScore;
            const awayWin = completed && match.awayScore > match.homeScore;
            const isHomeMine = highlightTeamId != null && match.homeTeamId === highlightTeamId;
            const isAwayMine = highlightTeamId != null && match.awayTeamId === highlightTeamId;
            const isMine = isHomeMine || isAwayMine;

            return (
              <tr
                key={match.matchId}
                className={isMine ? 'is-mine' : ''}
              >
                <td className="match-col-date">
                  <time className="match-date-text" dateTime={match.matchDate}>
                    {formatMatchDate(match.matchDate)}
                  </time>
                </td>

                <td className={`match-col-home ${homeWin ? 'is-winner' : ''} ${isHomeMine ? 'is-my-team' : ''}`}>
                  <span className="match-team-wrap home">
                    <span className="match-team-label" title={match.homeTeamName}>
                      {match.homeTeamName}
                    </span>
                    <EntityImage
                      src={match.homeTeamLogoUrl}
                      name={match.homeTeamName}
                      variant="logo"
                      className="entity-image-xs"
                    />
                  </span>
                </td>

                <td className="match-col-score">
                  {completed ? (
                    <span className="match-score-badge">
                      <span className={`score-digit ${homeWin ? 'strong' : ''}`}>{match.homeScore}</span>
                      <span className="score-divider">-</span>
                      <span className={`score-digit ${awayWin ? 'strong' : ''}`}>{match.awayScore}</span>
                    </span>
                  ) : (
                    <span className="match-vs-badge">VS</span>
                  )}
                </td>

                <td className={`match-col-away ${awayWin ? 'is-winner' : ''} ${isAwayMine ? 'is-my-team' : ''}`}>
                  <span className="match-team-wrap away">
                    <EntityImage
                      src={match.awayTeamLogoUrl}
                      name={match.awayTeamName}
                      variant="logo"
                      className="entity-image-xs"
                    />
                    <span className="match-team-label" title={match.awayTeamName}>
                      {match.awayTeamName}
                    </span>
                  </span>
                </td>

                <td className="match-col-status">
                  <span className={completed ? 'pill pill-completed' : 'pill pill-scheduled'}>
                    {match.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

