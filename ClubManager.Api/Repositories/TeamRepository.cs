using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Entities;
using Dapper;

namespace ClubManager.Api.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public TeamRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Team>> GetAllAsync()
    {
        const string sql = """
            SELECT TeamId, TeamName, City
            FROM dbo.Teams
            ORDER BY TeamName;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var teams = await connection.QueryAsync<Team>(sql);
        return teams.AsList();
    }

    public async Task<Team?> GetByIdAsync(int teamId)
    {
        const string sql = """
            SELECT TeamId, TeamName, City
            FROM dbo.Teams
            WHERE TeamId = @TeamId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Team>(sql, new { TeamId = teamId });
    }

    public async Task<bool> ExistsAsync(int teamId)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Teams WHERE TeamId = @TeamId;";

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { TeamId = teamId }) > 0;
    }

    public async Task<int> CreateAsync(Team team)
    {
        const string sql = """
            INSERT INTO dbo.Teams (TeamName, City)
            VALUES (@TeamName, @City);

            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            team.TeamName,
            team.City
        });
    }

    public async Task<bool> UpdateAsync(Team team)
    {
        const string sql = """
            UPDATE dbo.Teams
            SET TeamName = @TeamName,
                City     = @City
            WHERE TeamId = @TeamId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(sql, new
        {
            team.TeamId,
            team.TeamName,
            team.City
        });

        return rows > 0;
    }

    public async Task<bool> DeleteAsync(int teamId)
    {
        const string sql = "DELETE FROM dbo.Teams WHERE TeamId = @TeamId;";

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(sql, new { TeamId = teamId });

        return rows > 0;
    }

    public async Task<TeamReferenceCounts> GetReferenceCountsAsync(int teamId)
    {
        const string sql = """
            SELECT
                (SELECT COUNT(1) FROM dbo.Players WHERE TeamId = @TeamId)                             AS PlayerCount,
                (SELECT COUNT(1) FROM dbo.Users   WHERE TeamId = @TeamId)                             AS UserCount,
                (SELECT COUNT(1) FROM dbo.Matches WHERE HomeTeamId = @TeamId OR AwayTeamId = @TeamId) AS MatchCount;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleAsync<TeamReferenceCounts>(sql, new { TeamId = teamId });
    }
}
