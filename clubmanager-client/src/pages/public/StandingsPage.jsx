import useFetch from '../../api/useFetch';
import EntityImage from '../../components/ui/EntityImage';
import PageHeader from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useAuth } from '../../context/useAuth';

/**
 * League-table row accents (cosmetic): the leader gets the gold mark, the
 * bottom two sit in a relegation-style drop zone. The drop zone only appears
 * once the table is big enough for it to read sensibly.
 */
function rowAccent(index, total) {
  if (index === 0 && total > 1) return 'pos-leader pos-gold';
  if (index === 1 && total > 2) return 'pos-silver';
  if (index === 2 && total > 3) return 'pos-bronze';
  if (total >= 4 && index >= total - 2) return 'pos-drop';
  return '';
}

export default function StandingsPage() {
  const { data: standings, error, loading } = useFetch('/api/stats/standings');
  const { user } = useAuth();
  const myTeamId = user?.teamId ?? null;

  if (loading) {
    return (
      <div className="card">
        <LoadingState rows={6} label="Loading standings" />
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

  const total = standings.length;
  const showLegend = total >= 4;

  return (
    <>
      <PageHeader
        title="League Table"
        subtitle="Completed matches only. Ordered by points, then goal difference, then goals for."
      />

      <div className="card">
        {total === 0 ? (
          <EmptyState
            icon="▤"
            title="No teams yet"
            message="The table fills in as teams are added and results are entered."
          />
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
                            className="entity-image-sm"
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
                  <span className="legend-swatch legend-podium" /> Podium
                </span>
                <span className="legend-item">
                  <span className="legend-swatch legend-drop" /> Drop zone
                </span>
                {myTeamId != null && (
                  <span className="legend-item">
                    <span className="legend-swatch legend-mine" /> My team
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
