using System.Data;
using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Entities;
using Dapper;

namespace ClubManager.Api.Repositories;

public class UserRepository : IUserRepository
{
    /// <summary>
    /// The account projection, owned by dbo.vw_UserProfile - which is also where
    /// the avatar fallback for a Player account lives. Listing the columns rather
    /// than SELECT * keeps the contract explicit, and makes it visible that the
    /// password hash is not among them.
    /// </summary>
    private const string SelectUserProfile = """
        SELECT UserId, Username, Role, TeamId, CreatedAt, AvatarUrl, EffectiveAvatarUrl
        FROM dbo.vw_UserProfile
        """;

    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<UserWithAvatar>> GetAllAsync()
    {
        const string sql = $"""
            {SelectUserProfile}
            ORDER BY Username;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var users = await connection.QueryAsync<UserWithAvatar>(sql);
        return users.AsList();
    }

    /// <summary>Goes through dbo.User_GetByUsername - the one read that returns a password hash.</summary>
    public async Task<UserWithAvatar?> GetByUsernameAsync(string username)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleOrDefaultAsync<UserWithAvatar>(
            "dbo.User_GetByUsername",
            new { Username = username },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<UserWithAvatar?> GetByIdAsync(int userId)
    {
        const string sql = $"""
            {SelectUserProfile}
            WHERE UserId = @UserId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<UserWithAvatar>(sql, new { UserId = userId });
    }

    public async Task<bool> UsernameExistsAsync(string username)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Users WHERE Username = @Username;";

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { Username = username }) > 0;
    }

    public async Task<int> CreateAsync(User user)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>(
            "dbo.User_Create",
            new
            {
                user.Username,
                user.PasswordHash,
                user.Role,
                user.TeamId
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<ImageChangeResult> SetAvatarAsync(int userId, string? avatarUrl)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleAsync<ImageChangeResult>(
            "dbo.User_SetAvatar",
            new { UserId = userId, AvatarUrl = avatarUrl },
            commandType: CommandType.StoredProcedure);
    }

    /// <summary>
    /// Read back after a change, so a Player who clears their own avatar is told
    /// about the player photo it reverted to rather than being handed a null the
    /// UI would render as initials.
    /// </summary>
    public async Task<string?> GetEffectiveAvatarUrlAsync(int userId)
    {
        const string sql = """
            SELECT EffectiveAvatarUrl
            FROM dbo.vw_UserProfile
            WHERE UserId = @UserId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<string?>(sql, new { UserId = userId });
    }
}
