using ClubManager.Api.Helpers;
using Dapper;

namespace ClubManager.Api.Repositories;

public class StatsRepository : IStatsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public StatsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<TeamStandingRow>> GetStandingsAsync()
    {
        /*  Each completed match contributes two rows to MatchSides - one per team,
            each seen from that team's own point of view - so the aggregation below
            is a single GROUP BY rather than two sets of home/away CASE arithmetic.

            The score IS NOT NULL guard is deliberate belt-and-braces: MatchService
            already refuses to mark a match Completed without both scores, but a row
            edited directly in SQL would otherwise be counted as Played with the
            comparisons silently falling through to a loss.

            Teams are LEFT JOINed so a team with no completed match still appears,
            and COUNT(ms.TeamId) gives it 0 rather than 1.  */
        const string sql = """
            WITH MatchSides AS
            (
                SELECT HomeTeamId AS TeamId,
                       HomeScore  AS GoalsFor,
                       AwayScore  AS GoalsAgainst
                FROM dbo.Matches
                WHERE Status = @Completed
                  AND HomeScore IS NOT NULL
                  AND AwayScore IS NOT NULL

                UNION ALL

                SELECT AwayTeamId AS TeamId,
                       AwayScore  AS GoalsFor,
                       HomeScore  AS GoalsAgainst
                FROM dbo.Matches
                WHERE Status = @Completed
                  AND HomeScore IS NOT NULL
                  AND AwayScore IS NOT NULL
            )
            SELECT
                t.TeamId,
                t.TeamName,
                COUNT(ms.TeamId) AS Played,
                ISNULL(SUM(CASE WHEN ms.GoalsFor >  ms.GoalsAgainst THEN 1 ELSE 0 END), 0) AS Won,
                ISNULL(SUM(CASE WHEN ms.GoalsFor =  ms.GoalsAgainst THEN 1 ELSE 0 END), 0) AS Drawn,
                ISNULL(SUM(CASE WHEN ms.GoalsFor <  ms.GoalsAgainst THEN 1 ELSE 0 END), 0) AS Lost,
                ISNULL(SUM(ms.GoalsFor), 0)                                                AS GoalsFor,
                ISNULL(SUM(ms.GoalsAgainst), 0)                                            AS GoalsAgainst,
                ISNULL(SUM(ms.GoalsFor) - SUM(ms.GoalsAgainst), 0)                         AS GoalDifference,
                ISNULL(SUM(CASE WHEN ms.GoalsFor >  ms.GoalsAgainst THEN 3
                                WHEN ms.GoalsFor =  ms.GoalsAgainst THEN 1
                                ELSE 0 END), 0)                                            AS Points
            FROM dbo.Teams t
            LEFT JOIN MatchSides ms ON ms.TeamId = t.TeamId
            GROUP BY t.TeamId, t.TeamName
            ORDER BY Points DESC, GoalDifference DESC, GoalsFor DESC, t.TeamName ASC;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<TeamStandingRow>(
            sql, new { Completed = MatchStatuses.Completed });

        return rows.AsList();
    }

    public async Task<IReadOnlyList<TopScorerRow>> GetTopScorersAsync()
    {
        /*  No join to Matches and no status filter: goals count wherever they were
            recorded, matching the Phase 4 rule that goal entry is not gated on a
            match being Completed. The INNER JOIN keeps players with no goals out.
            TeamName is the scorer's CURRENT team, so a transfer moves their whole
            tally with them.  */
        const string sql = """
            SELECT
                p.PlayerId,
                p.Name     AS PlayerName,
                p.TeamId,
                t.TeamName,
                COUNT(*)   AS Goals
            FROM dbo.Goals g
            INNER JOIN dbo.Players p ON p.PlayerId = g.PlayerId
            INNER JOIN dbo.Teams   t ON t.TeamId   = p.TeamId
            GROUP BY p.PlayerId, p.Name, p.TeamId, t.TeamName
            ORDER BY Goals DESC, PlayerName ASC;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<TopScorerRow>(sql);

        return rows.AsList();
    }
}
