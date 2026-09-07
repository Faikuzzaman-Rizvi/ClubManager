import { Link } from 'react-router-dom';

const MAX_ROWS = 6;
const PODIUM = 3;

export default function TopScorersWidget({ topScorers }) {
  const rows = topScorers.slice(0, MAX_ROWS);

  return (
    <>
      <ol className="scorer-list">
        {rows.map((scorer, index) => (
          <li
            className={`scorer-row ${index < PODIUM ? 'is-podium' : ''}`}
            key={scorer.playerId}
          >
            <span className="scorer-rank">{String(index + 1).padStart(2, '0')}</span>
            <span className="scorer-id">
              <span className="scorer-name">{scorer.playerName}</span>
              <span className="scorer-team">{scorer.teamName}</span>
            </span>
            <span className="scorer-goals">{scorer.goals}</span>
          </li>
        ))}
      </ol>

      <div className="section-title" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
        <Link to="/topscorers" className="btn-link">
          View top scorers
        </Link>
      </div>
    </>
  );
}
