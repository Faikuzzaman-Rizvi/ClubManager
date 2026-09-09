import EntityImage from '../ui/EntityImage';

const MAX_ROWS = 6;
const PODIUM = 3;

function podiumClass(index) {
  if (index === 0) return 'pos-leader pos-gold';
  if (index === 1) return 'pos-silver';
  if (index === 2) return 'pos-bronze';
  return '';
}

export default function TopScorersWidget({ topScorers }) {
  const rows = topScorers.slice(0, MAX_ROWS);

  return (
    <div className="table-scroll">
      <table className="dash-table topscorers-table">
        <thead>
          <tr>
            <th className="pos-cell">#</th>
            <th>Player</th>
            <th>Team</th>
            <th className="num">Goals</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((scorer, index) => (
            <tr key={scorer.playerId} className={podiumClass(index)}>
              <td className="pos-cell">
                <span className="pos-num">{index + 1}</span>
              </td>
              <td className="table-id">
                <span className="team-cell">
                  <EntityImage
                    src={scorer.playerImageUrl}
                    name={scorer.playerName}
                    variant="avatar"
                    className="entity-image-sm"
                  />
                  <span>{scorer.playerName}</span>
                </span>
              </td>
              <td>
                <span className="team-cell">
                  <EntityImage
                    src={scorer.teamLogoUrl}
                    name={scorer.teamName}
                    variant="logo"
                    className="entity-image-xs"
                  />
                  <span>{scorer.teamName}</span>
                </span>
              </td>
              <td className="num strong">
                <span className="scorer-goal-badge">{scorer.goals}</span>
                {index < PODIUM && (
                  <span className="visually-hidden"> - top {PODIUM} scorer</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

