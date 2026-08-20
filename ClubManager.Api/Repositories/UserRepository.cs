using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Entities;
using Dapper;

namespace ClubManager.Api.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<User>> GetAllAsync()
    {
        const string sql = """
            SELECT UserId, Username, Role, TeamId, CreatedAt
            FROM dbo.Users
            ORDER BY Username;
            """;

        using var connection = _connectionFactory.CreateConnection();
        var users = await connection.QueryAsync<User>(sql);
        return users.AsList();
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        const string sql = """
            SELECT UserId, Username, PasswordHash, Role, TeamId, CreatedAt
            FROM dbo.Users
            WHERE Username = @Username;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Username = username });
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        const string sql = """
            SELECT UserId, Username, PasswordHash, Role, TeamId, CreatedAt
            FROM dbo.Users
            WHERE UserId = @UserId;
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { UserId = userId });
    }

    public async Task<bool> UsernameExistsAsync(string username)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Users WHERE Username = @Username;";

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { Username = username }) > 0;
    }

    public async Task<int> CreateAsync(User user)
    {
        const string sql = """
            INSERT INTO dbo.Users (Username, PasswordHash, Role, TeamId)
            VALUES (@Username, @PasswordHash, @Role, @TeamId);

            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            user.Username,
            user.PasswordHash,
            user.Role,
            user.TeamId
        });
    }
}
