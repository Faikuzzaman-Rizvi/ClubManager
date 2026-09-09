using System.Data;
using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Entities;
using Dapper;

namespace ClubManager.Api.Repositories;

public class MatchRepository : IMatchRepository
{
    /// <summary>
    /// The match-with-team-names projection, owned by dbo.vw_MatchDetails. Listing
    /// the columns rather than SELECT * keeps the contract explicit, so adding a
    /// column to the view cannot quietly change what this returns.
    /// </summary>
    private const string SelectMatchDetails = """
        SELECT MatchId,
               HomeTeamId, HomeTeamName, HomeTeamLogoUrl,
               AwayTeamId, AwayTeamName, AwayTeamLogoUrl,
               MatchDate, HomeScore, AwayScore, Status
        FROM dbo.vw_MatchDetails
        """;

    /// <summary>The goal-with-scorer projection, owned by dbo.vw_MatchGoals.</summary>
    private const string SelectMatchGoals = """
        SELECT GoalId, MatchId, PlayerId, PlayerName, PlayerImageUrl,
               TeamId, TeamName, TeamLogoUrl, Minute
        FROM dbo.vw_MatchGoals
        """;

    private readonly IDbConnectionFactory _connectionFactory;

    public MatchRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<MatchWithTeams>> GetAllAsync()
    {
        const string sql = $"""
            {SelectMatchDetails}
            ORDER BY MatchDate DESC, MatchId DESC;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var matches = await connection.QueryAsync<MatchWithTeams>(sql);
        return matches.AsList();
    }

    public async Task<MatchWithTeams?> GetByIdAsync(int matchId)
    {
        const string sql = $"""
            {SelectMatchDetails}
            WHERE MatchId = @MatchId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<MatchWithTeams>(sql, new { MatchId = matchId });
    }

    public async Task<int> CreateAsync(Match match)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>(
            "dbo.Match_Create",
            new
            {
                match.HomeTeamId,
                match.AwayTeamId,
                match.MatchDate,
                match.HomeScore,
                match.AwayScore,
                match.Status
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> UpdateAsync(Match match)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.ExecuteScalarAsync<int>(
            "dbo.Match_Update",
            new
            {
                match.MatchId,
                match.HomeTeamId,
                match.AwayTeamId,
                match.MatchDate,
                match.HomeScore,
                match.AwayScore,
                match.Status
            },
            commandType: CommandType.StoredProcedure);

        return rows > 0;
    }

    public async Task<IReadOnlyList<GoalWithPlayer>> GetGoalsAsync(int matchId)
    {
        const string sql = $"""
            {SelectMatchGoals}
            WHERE MatchId = @MatchId
            -- Untimed goals sort after the timed ones, not before: SQL Server
            -- orders NULL first by default.
            ORDER BY CASE WHEN Minute IS NULL THEN 1 ELSE 0 END, Minute, GoalId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var goals = await connection.QueryAsync<GoalWithPlayer>(sql, new { MatchId = matchId });
        return goals.AsList();
    }

    public async Task<int> AddGoalAsync(Goal goal)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>(
            "dbo.Goal_Create",
            new
            {
                goal.MatchId,
                goal.PlayerId,
                goal.Minute
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<GoalWithPlayer?> GetGoalByIdAsync(int goalId)
    {
        const string sql = $"""
            {SelectMatchGoals}
            WHERE GoalId = @GoalId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<GoalWithPlayer>(sql, new { GoalId = goalId });
    }
}
