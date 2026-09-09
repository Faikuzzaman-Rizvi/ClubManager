using System.Data;
using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Entities;
using Dapper;

namespace ClubManager.Api.Repositories;

public class PlayerRepository : IPlayerRepository
{
    /// <summary>
    /// The player-with-team projection, owned by dbo.vw_PlayerProfile. Listing the
    /// columns rather than SELECT * keeps the contract explicit, so adding a column
    /// to the view cannot quietly change what this returns.
    /// </summary>
    private const string SelectPlayerProfile = """
        SELECT PlayerId, UserId, TeamId, Name, Position, JerseyNumber, Age,
               ImageUrl, TeamName, TeamLogoUrl
        FROM dbo.vw_PlayerProfile
        """;

    private readonly IDbConnectionFactory _connectionFactory;

    public PlayerRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<PlayerWithTeam>> GetAllAsync(int? teamId)
    {
        const string sql = $"""
            {SelectPlayerProfile}
            WHERE (@TeamId IS NULL OR TeamId = @TeamId)
            ORDER BY TeamName, JerseyNumber, Name;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var players = await connection.QueryAsync<PlayerWithTeam>(sql, new { TeamId = teamId });
        return players.AsList();
    }

    public async Task<PlayerWithTeam?> GetByIdAsync(int playerId)
    {
        const string sql = $"""
            {SelectPlayerProfile}
            WHERE PlayerId = @PlayerId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PlayerWithTeam>(sql, new { PlayerId = playerId });
    }

    public async Task<PlayerWithTeam?> GetByUserIdAsync(int userId)
    {
        const string sql = $"""
            {SelectPlayerProfile}
            WHERE UserId = @UserId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PlayerWithTeam>(sql, new { UserId = userId });
    }

    public async Task<int> CreateAsync(Player player)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>(
            "dbo.Player_Create",
            new
            {
                player.UserId,
                player.TeamId,
                player.Name,
                player.Position,
                player.JerseyNumber,
                player.Age
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> UpdateAsync(Player player)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.ExecuteScalarAsync<int>(
            "dbo.Player_Update",
            new
            {
                player.PlayerId,
                player.UserId,
                player.TeamId,
                player.Name,
                player.Position,
                player.JerseyNumber,
                player.Age
            },
            commandType: CommandType.StoredProcedure);

        return rows > 0;
    }

    public async Task<PlayerDeleteResult> DeleteAsync(int playerId)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleAsync<PlayerDeleteResult>(
            "dbo.Player_Delete",
            new { PlayerId = playerId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<ImageChangeResult> SetImageAsync(int playerId, string? imageUrl)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleAsync<ImageChangeResult>(
            "dbo.Player_SetImage",
            new { PlayerId = playerId, ImageUrl = imageUrl },
            commandType: CommandType.StoredProcedure);
    }

    /*  Stays as inline SQL. dbo.Player_AssertWritable enforces the same rule
        inside the write procedures; this exists so the service can refuse a clash
        with a message naming the number, before anything is attempted.  */
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
}
