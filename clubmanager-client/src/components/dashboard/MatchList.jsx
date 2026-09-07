import { formatMatchDate } from '../../helpers/datetime';

/**
 * Compact fixture/result rows. `highlightTeamId` bolds the viewer's own team so
 * a coach can scan their own fixtures at a glance.
 */
export default function MatchList({ matches, highlightTeamId = null }) {
  return (
    <ul className="match-list">
      {matches.map((match) => {
        const completed = match.status === 'Completed';
        const homeWin = completed && match.homeScore > match.awayScore;
        const awayWin = completed && match.awayScore > match.homeScore;
        const mine = (side) => (highlightTeamId != null && side === highlightTeamId ? 'is-winner' : '');

        return (
          <li className="match-row" key={match.matchId}>
            <span className={`match-row-side ${homeWin ? 'is-winner' : mine(match.homeTeamId)}`}>
              {match.homeTeamName}
            </span>

            <span className="match-row-score">
              {completed ? `${match.homeScore} – ${match.awayScore}` : 'v'}
            </span>

            <span className={`match-row-side away ${awayWin ? 'is-winner' : mine(match.awayTeamId)}`}>
              {match.awayTeamName}
            </span>

            <span className="match-row-meta">
              <time dateTime={match.matchDate}>{formatMatchDate(match.matchDate)}</time>
              <span className={completed ? 'pill pill-completed' : 'pill pill-scheduled'}>
                {match.status}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
