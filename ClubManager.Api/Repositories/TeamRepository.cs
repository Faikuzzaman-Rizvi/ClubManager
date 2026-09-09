using System.Data;
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

    /*  The reads below stay as inline SQL: Teams is a single table with four
        columns and no join, so a view would only add a name to maintain. The
        writes all go through procedures.  */

    public async Task<IReadOnlyList<Team>> GetAllAsync()
    {
        const string sql = """
            SELECT TeamId, TeamName, City, LogoUrl
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
            SELECT TeamId, TeamName, City, LogoUrl
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
        using var connection = _connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>(
            "dbo.Team_Create",
            new
            {
                team.TeamName,
                team.City
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> UpdateAsync(Team team)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.ExecuteScalarAsync<int>(
            "dbo.Team_Update",
            new
            {
                team.TeamId,
                team.TeamName,
                team.City
            },
            commandType: CommandType.StoredProcedure);

        return rows > 0;
    }

    public async Task<ImageChangeResult> SetLogoAsync(int teamId, string? logoUrl)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleAsync<ImageChangeResult>(
            "dbo.Team_SetLogo",
            new { TeamId = teamId, LogoUrl = logoUrl },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<TeamDeleteResult> DeleteAsync(int teamId)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleAsync<TeamDeleteResult>(
            "dbo.Team_Delete",
            new { TeamId = teamId },
            commandType: CommandType.StoredProcedure);
    }
}
