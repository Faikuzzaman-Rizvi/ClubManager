using ClubManager.Api.Helpers;
using Dapper;

namespace ClubManager.Api.Repositories;

/// <summary>
/// Both reports are aggregated by the database - dbo.vw_Standings and
/// dbo.vw_TopScorers do the arithmetic and the grouping, and nothing is ever
/// counted up in memory here. A view cannot carry ORDER BY, so the sort is the
/// one thing that stays in these queries.
/// </summary>
public class StatsRepository : IStatsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public StatsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<TeamStandingRow>> GetStandingsAsync()
    {
        const string sql = """
            SELECT TeamId, TeamName, LogoUrl, Played, Won, Drawn, Lost,
                   GoalsFor, GoalsAgainst, GoalDifference, Points
            FROM dbo.vw_Standings
            ORDER BY Points DESC, GoalDifference DESC, GoalsFor DESC, TeamName ASC;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<TeamStandingRow>(sql);

        return rows.AsList();
    }

    public async Task<IReadOnlyList<TopScorerRow>> GetTopScorersAsync()
    {
        const string sql = """
            SELECT PlayerId, PlayerName, PlayerImageUrl,
                   TeamId, TeamName, TeamLogoUrl, Goals
            FROM dbo.vw_TopScorers
            ORDER BY Goals DESC, PlayerName ASC;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.QueryAsync<TopScorerRow>(sql);

        return rows.AsList();
    }
}
