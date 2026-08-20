import useFetch from '../../api/useFetch';

export default function TopScorersPage() {
  const { data: scorers, error, loading } = useFetch('/api/stats/topscorers');

  if (loading) return <p className="muted">Loading top scorers...</p>;
  if (error) return <p className="error" role="alert">{error}</p>;

  return (
    <div className="card">
      <h1>Top Scorers</h1>
      <p className="muted">Goals from every match on record. Only players who have scored appear.</p>

      {scorers.length === 0 ? (
        <p className="muted">No goals recorded yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="pos-cell">#</th>
                <th>Player</th>
                <th>Team</th>
                <th className="num">Goals</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((row, index) => (
                <tr key={row.playerId}>
                  <td className="pos-cell">
                    <span className="pos-num">{index + 1}</span>
                  </td>
                  <td>{row.playerName}</td>
                  <td>{row.teamName}</td>
                  <td className="num strong">{row.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
