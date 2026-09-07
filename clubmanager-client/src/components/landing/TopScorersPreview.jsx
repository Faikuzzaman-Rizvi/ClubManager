import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading';

const MAX_ROWS = 5;

export default function TopScorersPreview({ topScorers, loading, failed }) {
  const leaders = topScorers.slice(0, MAX_ROWS);
  const best = leaders[0]?.goals ?? 0;

  return (
    <section className="ld-section" id="scorers" aria-labelledby="scorers-title">
      <SectionHeading
        kicker="Golden boot"
        title={<span id="scorers-title">Top scorers</span>}
        action={
          <Link to="/topscorers" className="ld-btn ld-btn-ghost">
            View top scorers
          </Link>
        }
      />

      {failed ? (
        <p className="ld-empty">Could not load scorers right now.</p>
      ) : loading ? (
        <p className="ld-empty">Loading scorers…</p>
      ) : leaders.length === 0 ? (
        <p className="ld-empty">No goals recorded yet.</p>
      ) : (
        <ol className="ld-scorers">
          {leaders.map((scorer, index) => (
            <li className="ld-scorer" key={scorer.playerId} data-reveal-card>
              <span className="ld-scorer-rank">{String(index + 1).padStart(2, '0')}</span>

              <span className="ld-scorer-id">
                <span className="ld-scorer-name">{scorer.playerName}</span>
                <span className="ld-scorer-team">{scorer.teamName}</span>
              </span>

              <span className="ld-scorer-bar" aria-hidden="true">
                <i style={{ '--fill': `${best ? (scorer.goals / best) * 100 : 0}%` }} />
              </span>

              <span className="ld-scorer-goals">
                {scorer.goals}
                <small>{scorer.goals === 1 ? 'goal' : 'goals'}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
