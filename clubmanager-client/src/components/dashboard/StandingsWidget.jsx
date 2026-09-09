import EntityImage from '../ui/EntityImage';

const MAX_ROWS = 6;

function rowAccent(index, total) {
  if (index === 0 && total > 1) return 'pos-leader pos-gold';
  if (index === 1 && total > 2) return 'pos-silver';
  if (index === 2 && total > 3) return 'pos-bronze';
  if (total >= 4 && index >= total - 2) return 'pos-drop';
  return '';
}

/** Full-width league table widget. The viewer's own team is highlighted where known. */
export default function StandingsWidget({ standings, myTeamId = null }) {
  const rows = standings.slice(0, MAX_ROWS);
  const total = standings.length;

  return (
    <div className="table-scroll">
      <table className="dash-table standings-table">
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
          {rows.map((row, index) => {
            const gd = row.goalDifference ?? (row.goalsFor - row.goalsAgainst);
            return (
              <tr
                key={row.teamId}
                className={[
                  rowAccent(index, total),
                  row.teamId === myTeamId ? 'is-mine' : '',
                ].join(' ').trim()}
              >
                <td className="pos-cell">
                  <span className="pos-num">{index + 1}</span>
                </td>
                <td className="table-id">
                  <span className="team-cell">
                    <EntityImage
                      src={row.logoUrl}
                      name={row.teamName}
                      variant="logo"
                      className="entity-image-xs"
                    />
                    <span>{row.teamName}</span>
                  </span>
                </td>
                <td className="num">{row.played}</td>
                <td className="num">{row.won}</td>
                <td className="num">{row.drawn}</td>
                <td className="num">{row.lost}</td>
                <td className="num">{row.goalsFor}</td>
                <td className="num">{row.goalsAgainst}</td>
                <td className="num">{gd > 0 ? `+${gd}` : gd}</td>
                <td className="num strong">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

