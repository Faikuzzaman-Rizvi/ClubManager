import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading';
import EntityImage from '../ui/EntityImage';
import { formatMatchDay } from '../../helpers/datetime';

const MAX_CARDS = 4;

/**
 * Most recent completed results. /api/matches needs a token, so signed-out
 * visitors get an invitation to sign in rather than an error.
 */
export default function LatestMatches({ matches, loading, failed, canRead }) {
  const played = (matches ?? [])
    .filter((match) => match.status === 'Completed')
    .slice(0, MAX_CARDS);

  return (
    <section className="ld-section" id="matches" aria-labelledby="matches-title">
      <SectionHeading
        kicker="Results"
        title={<span id="matches-title">Latest matches</span>}
      />

      {!canRead ? (
        <div className="ld-empty ld-empty-cta">
          <p>Match results are part of the club area.</p>
          <Link to="/login" className="ld-btn ld-btn-ghost">
            Sign in to view
          </Link>
        </div>
      ) : failed ? (
        <p className="ld-empty">Could not load matches right now.</p>
      ) : loading ? (
        <p className="ld-empty">Loading matches…</p>
      ) : played.length === 0 ? (
        <p className="ld-empty">No completed matches yet.</p>
      ) : (
        <div className="ld-match-grid">
          {played.map((match) => {
            const homeWin = match.homeScore > match.awayScore;
            const awayWin = match.awayScore > match.homeScore;
            const isDraw = match.homeScore === match.awayScore;

            return (
              <article className="ld-match-card" key={match.matchId} data-reveal-card>
                <header className="ld-match-meta">
                  <time dateTime={match.matchDate}>{formatMatchDay(match.matchDate)}</time>
                  <span className="ld-tag">Full time</span>
                </header>

                <div className="ld-match-teams">
                  <div
                    className={`ld-match-team-row ${
                      homeWin ? 'is-winner' : isDraw ? 'is-draw' : ''
                    }`}
                  >
                    <div className="ld-match-team-info">
                      <EntityImage
                        src={match.homeTeamLogoUrl}
                        name={match.homeTeamName}
                        variant="logo"
                        className="ld-crest"
                      />
                      <span className="ld-match-team-name" title={match.homeTeamName}>
                        {match.homeTeamName}
                      </span>
                    </div>
                    <span className="ld-match-score-num">{match.homeScore}</span>
                  </div>

                  <div
                    className={`ld-match-team-row ${
                      awayWin ? 'is-winner' : isDraw ? 'is-draw' : ''
                    }`}
                  >
                    <div className="ld-match-team-info">
                      <EntityImage
                        src={match.awayTeamLogoUrl}
                        name={match.awayTeamName}
                        variant="logo"
                        className="ld-crest"
                      />
                      <span className="ld-match-team-name" title={match.awayTeamName}>
                        {match.awayTeamName}
                      </span>
                    </div>
                    <span className="ld-match-score-num">{match.awayScore}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
