using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Entities;
using Dapper;

namespace ClubManager.Api.Repositories;

public class PlayerRepository : IPlayerRepository
{
    /// <summary>Shared projection so list, detail and lookup all return the same columns.</summary>
    private const string SelectPlayerWithTeam = """
        SELECT p.PlayerId, p.UserId, p.TeamId, p.Name, p.Position, p.JerseyNumber, p.Age,
               t.TeamName
        FROM dbo.Players p
        INNER JOIN dbo.Teams t ON t.TeamId = p.TeamId
        """;

    private readonly IDbConnectionFactory _connectionFactory;

    public PlayerRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<PlayerWithTeam>> GetAllAsync(int? teamId)
    {
        const string sql = $"""
            {SelectPlayerWithTeam}
            WHERE (@TeamId IS NULL OR p.TeamId = @TeamId)
            ORDER BY t.TeamName, p.JerseyNumber, p.Name;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var players = await connection.QueryAsync<PlayerWithTeam>(sql, new { TeamId = teamId });
        return players.AsList();
    }

    public async Task<PlayerWithTeam?> GetByIdAsync(int playerId)
    {
        const string sql = $"""
            {SelectPlayerWithTeam}
            WHERE p.PlayerId = @PlayerId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PlayerWithTeam>(sql, new { PlayerId = playerId });
    }

    public async Task<PlayerWithTeam?> GetByUserIdAsync(int userId)
    {
        const string sql = $"""
            {SelectPlayerWithTeam}
            WHERE p.UserId = @UserId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PlayerWithTeam>(sql, new { UserId = userId });
    }

    public async Task<int> CreateAsync(Player player)
    {
        const string sql = """
            INSERT INTO dbo.Players (UserId, TeamId, Name, Position, JerseyNumber, Age)
            VALUES (@UserId, @TeamId, @Name, @Position, @JerseyNumber, @Age);

            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            player.UserId,
            player.TeamId,
            player.Name,
            player.Position,
            player.JerseyNumber,
            player.Age
        });
    }

    public async Task<bool> UpdateAsync(Player player)
    {
        const string sql = """
            UPDATE dbo.Players
            SET UserId       = @UserId,
                TeamId       = @TeamId,
                Name         = @Name,
                Position     = @Position,
                JerseyNumber = @JerseyNumber,
                Age          = @Age
            WHERE PlayerId = @PlayerId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(sql, new
        {
            player.PlayerId,
            player.UserId,
            player.TeamId,
            player.Name,
            player.Position,
            player.JerseyNumber,
            player.Age
        });

        return rows > 0;
    }

    public async Task<bool> DeleteAsync(int playerId)
    {
        const string sql = "DELETE FROM dbo.Players WHERE PlayerId = @PlayerId;";

        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(sql, new { PlayerId = playerId });

        return rows > 0;
    }

    public async Task<bool> JerseyNumberTakenAsync(int teamId, int jerseyNumber, int? excludePlayerId)
    {
        const string sql = """
            SELECT COUNT(1)
            FROM dbo.Players
            WHERE TeamId = @TeamId
              AND JerseyNumber = @JerseyNumber
              AND (@ExcludePlayerId IS NULL OR PlayerId <> @ExcludePlayerId);
            """;

        using var connection = _connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(sql, new
        {
            TeamId = teamId,
            JerseyNumber = jerseyNumber,
            ExcludePlayerId = excludePlayerId
        });

        return count > 0;
    }

    public async Task<int> GetGoalCountAsync(int playerId)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Goals WHERE PlayerId = @PlayerId;";

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { PlayerId = playerId });
    }
}
