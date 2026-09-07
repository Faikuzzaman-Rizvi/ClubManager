import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading';

const MAX_ROWS = 5;

export default function StandingsPreview({ standings, loading, failed }) {
  const rows = standings.slice(0, MAX_ROWS);

  return (
    <section className="ld-section" id="standings" aria-labelledby="standings-title">
      <SectionHeading
        kicker="Competition"
        title={<span id="standings-title">League standings</span>}
        action={
          <Link to="/standings" className="ld-btn ld-btn-ghost">
            View full standings
          </Link>
        }
      />

      {failed ? (
        <p className="ld-empty">Could not load the table right now.</p>
      ) : loading ? (
        <p className="ld-empty">Loading table…</p>
      ) : rows.length === 0 ? (
        <p className="ld-empty">No teams registered yet.</p>
      ) : (
        <div className="ld-table-wrap" data-reveal>
          <table className="ld-table">
            <caption className="ld-visually-hidden">
              Top {rows.length} teams by points
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Team</th>
                <th scope="col" className="ld-num">P</th>
                <th scope="col" className="ld-num">W</th>
                <th scope="col" className="ld-num">D</th>
                <th scope="col" className="ld-num">L</th>
                <th scope="col" className="ld-num">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.teamId} className={index === 0 ? 'is-leader' : ''}>
                  <td className="ld-pos">{index + 1}</td>
                  <td className="ld-team">{row.teamName}</td>
                  <td className="ld-num">{row.played}</td>
                  <td className="ld-num">{row.won}</td>
                  <td className="ld-num">{row.drawn}</td>
                  <td className="ld-num">{row.lost}</td>
                  <td className="ld-num ld-strong">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
