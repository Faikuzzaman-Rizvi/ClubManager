import { Link } from 'react-router-dom';

const MAX_ROWS = 6;

/** Compact league table. The viewer's own team is highlighted where known. */
export default function StandingsWidget({ standings, myTeamId = null }) {
  const rows = standings.slice(0, MAX_ROWS);

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="pos-cell">#</th>
              <th>Team</th>
              <th className="num">P</th>
              <th className="num">W</th>
              <th className="num">D</th>
              <th className="num">L</th>
              <th className="num">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.teamId}
                className={[
                  index === 0 && rows.length > 1 ? 'pos-leader' : '',
                  row.teamId === myTeamId ? 'is-mine' : '',
                ].join(' ').trim()}
              >
                <td className="pos-cell">
                  <span className="pos-num">{index + 1}</span>
                </td>
                <td className="table-id">{row.teamName}</td>
                <td className="num">{row.played}</td>
                <td className="num">{row.won}</td>
                <td className="num">{row.drawn}</td>
                <td className="num">{row.lost}</td>
                <td className="num strong">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
        <Link to="/standings" className="btn-link">
          View full standings
        </Link>
      </div>
    </>
  );
}
