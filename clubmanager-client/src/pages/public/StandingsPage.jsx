import useFetch from '../../api/useFetch';

/**
 * League-table row accents (cosmetic): the leader gets the gold mark, the
 * bottom two sit in a relegation-style drop zone. The drop zone only appears
 * once the table is big enough for it to read sensibly.
 */
function rowAccent(index, total) {
  if (index === 0 && total > 1) return 'pos-leader';
  if (total >= 4 && index >= total - 2) return 'pos-drop';
  return '';
}

export default function StandingsPage() {
  const { data: standings, error, loading } = useFetch('/api/stats/standings');

  if (loading) return <p className="muted">Loading standings...</p>;
  if (error) return <p className="error" role="alert">{error}</p>;

  const total = standings.length;
  const showLegend = total >= 4;

  return (
    <div className="card">
      <h1>League Table</h1>
      <p className="muted">
        Completed matches only. Ordered by points, then goal difference, then goals for.
      </p>

      {total === 0 ? (
        <p className="muted">No teams yet.</p>
      ) : (
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
                  <th className="num">GF</th>
                  <th className="num">GA</th>
                  <th className="num">GD</th>
                  <th className="num">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr key={row.teamId} className={rowAccent(index, total)}>
                    <td className="pos-cell">
                      <span className="pos-num">{index + 1}</span>
                    </td>
                    <td>{row.teamName}</td>
                    <td className="num">{row.played}</td>
                    <td className="num">{row.won}</td>
                    <td className="num">{row.drawn}</td>
                    <td className="num">{row.lost}</td>
                    <td className="num">{row.goalsFor}</td>
                    <td className="num">{row.goalsAgainst}</td>
                    <td className="num">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="num strong">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showLegend && (
            <div className="table-legend">
              <span className="legend-item">
                <span className="legend-swatch legend-leader" /> Leader
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-drop" /> Drop zone
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
