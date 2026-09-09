import useFetch from '../../api/useFetch';
import EntityImage from '../../components/ui/EntityImage';
import PageHeader from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

const PODIUM = 3;

function podiumClass(index) {
  if (index === 0) return 'pos-leader pos-gold';
  if (index === 1) return 'pos-silver';
  if (index === 2) return 'pos-bronze';
  return '';
}

export default function TopScorersPage() {
  const { data: scorers, error, loading } = useFetch('/api/stats/topscorers');

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={6} label="Loading top scorers" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Top Scorers"
        subtitle="Goals from every match on record. Only players who have scored appear."
      />

      <div className="card">
        {scorers.length === 0 ? (
          <EmptyState
            icon="◎"
            title="No goals recorded yet"
            message="The chart fills in as goals are credited to players."
          />
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
                  <tr key={row.playerId} className={podiumClass(index)}>
                    <td className="pos-cell">
                      <span className="pos-num">{index + 1}</span>
                    </td>
                    <td className="table-id">
                      <span className="team-cell">
                        <EntityImage
                          src={row.playerImageUrl}
                          name={row.playerName}
                          variant="avatar"
                          className="entity-image-sm"
                        />
                        <span>{row.playerName}</span>
                      </span>
                    </td>
                    <td>
                      <span className="team-cell">
                        <EntityImage
                          src={row.teamLogoUrl}
                          name={row.teamName}
                          variant="logo"
                          className="entity-image-xs"
                        />
                        <span>{row.teamName}</span>
                      </span>
                    </td>
                    <td className="num strong">
                      {row.goals}
                      {index < PODIUM && (
                        <span className="visually-hidden"> - top {PODIUM} scorer</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
