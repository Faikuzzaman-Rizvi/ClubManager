using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Entities;
using Dapper;

namespace ClubManager.Api.Repositories;

public class MatchRepository : IMatchRepository
{
    /// <summary>Shared projection so list and detail return the same match columns.</summary>
    private const string SelectMatchWithTeams = """
        SELECT m.MatchId, m.HomeTeamId, m.AwayTeamId, m.MatchDate,
               m.HomeScore, m.AwayScore, m.Status,
               h.TeamName AS HomeTeamName,
               a.TeamName AS AwayTeamName
        FROM dbo.Matches m
        INNER JOIN dbo.Teams h ON h.TeamId = m.HomeTeamId
        INNER JOIN dbo.Teams a ON a.TeamId = m.AwayTeamId
        """;

    /// <summary>Goals joined to the scorer and the scorer's current team.</summary>
    private const string SelectGoalWithPlayer = """
        SELECT g.GoalId, g.MatchId, g.PlayerId, g.Minute,
               p.Name AS PlayerName,
               p.TeamId,
               t.TeamName
        FROM dbo.Goals g
        INNER JOIN dbo.Players p ON p.PlayerId = g.PlayerId
        INNER JOIN dbo.Teams   t ON t.TeamId   = p.TeamId
        """;

    private readonly IDbConnectionFactory _connectionFactory;

    public MatchRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<MatchWithTeams>> GetAllAsync()
    {
        const string sql = $"""
            {SelectMatchWithTeams}
            ORDER BY m.MatchDate DESC, m.MatchId DESC;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var matches = await connection.QueryAsync<MatchWithTeams>(sql);
        return matches.AsList();
    }

    public async Task<MatchWithTeams?> GetByIdAsync(int matchId)
    {
        const string sql = $"""
            {SelectMatchWithTeams}
            WHERE m.MatchId = @MatchId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<MatchWithTeams>(sql, new { MatchId = matchId });
    }

    public async Task<int> CreateAsync(Match match)
    {
        const string sql = """
            INSERT INTO dbo.Matches (HomeTeamId, AwayTeamId, MatchDate, HomeScore, AwayScore, Status)
            VALUES (@HomeTeamId, @AwayTeamId, @MatchDate, @HomeScore, @AwayScore, @Status);

            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            match.HomeTeamId,
            match.AwayTeamId,
            match.MatchDate,
            match.HomeScore,
            match.AwayScore,
            match.Status
        });
    }

    public async Task<bool> UpdateAsync(Match match)
    {
        const string sql = """
            UPDATE dbo.Matches
            SET HomeTeamId = @HomeTeamId,
                AwayTeamId = @AwayTeamId,
                MatchDate  = @MatchDate,
                HomeScore  = @HomeScore,
                AwayScore  = @AwayScore,
                Status     = @Status
            WHERE MatchId = @MatchId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(sql, new
        {
            match.MatchId,
            match.HomeTeamId,
            match.AwayTeamId,
            match.MatchDate,
            match.HomeScore,
            match.AwayScore,
            match.Status
        });

        return rows > 0;
    }

    public async Task<IReadOnlyList<GoalWithPlayer>> GetGoalsAsync(int matchId)
    {
        const string sql = $"""
            {SelectGoalWithPlayer}
            WHERE g.MatchId = @MatchId
            -- Untimed goals sort after the timed ones, not before: SQL Server
            -- orders NULL first by default.
            ORDER BY CASE WHEN g.Minute IS NULL THEN 1 ELSE 0 END, g.Minute, g.GoalId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var goals = await connection.QueryAsync<GoalWithPlayer>(sql, new { MatchId = matchId });
        return goals.AsList();
    }

    public async Task<int> AddGoalAsync(Goal goal)
    {
        const string sql = """
            INSERT INTO dbo.Goals (MatchId, PlayerId, Minute)
            VALUES (@MatchId, @PlayerId, @Minute);

            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            goal.MatchId,
            goal.PlayerId,
            goal.Minute
        });
    }

    public async Task<GoalWithPlayer?> GetGoalByIdAsync(int goalId)
    {
        const string sql = $"""
            {SelectGoalWithPlayer}
            WHERE g.GoalId = @GoalId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<GoalWithPlayer>(sql, new { GoalId = goalId });
    }
}
