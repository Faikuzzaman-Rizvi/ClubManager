using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Models.Entities;
using ClubManager.Api.Repositories;

namespace ClubManager.Api.Services;

public class TeamService : ITeamService
{
    private readonly ITeamRepository _teamRepository;
    private readonly ILogger<TeamService> _logger;

    public TeamService(ITeamRepository teamRepository, ILogger<TeamService> logger)
    {
        _teamRepository = teamRepository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TeamDto>> GetAllAsync()
    {
        var teams = await _teamRepository.GetAllAsync();
        return teams.Select(ToDto).ToList();
    }

    public async Task<ServiceResult<TeamDto>> GetByIdAsync(int teamId)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);

        return team is null
            ? NotFound(teamId)
            : ServiceResult<TeamDto>.Ok(ToDto(team));
    }

    public async Task<ServiceResult<TeamDto>> CreateAsync(CreateTeamRequest request)
    {
        var team = new Team
        {
            TeamName = request.TeamName.Trim(),
            City = NormaliseCity(request.City)
        };

        team.TeamId = await _teamRepository.CreateAsync(team);
        _logger.LogInformation("Created team {TeamName} (TeamId {TeamId}).", team.TeamName, team.TeamId);

        return ServiceResult<TeamDto>.Ok(ToDto(team));
    }

    public async Task<ServiceResult<TeamDto>> UpdateAsync(int teamId, UpdateTeamRequest request)
    {
        var team = new Team
        {
            TeamId = teamId,
            TeamName = request.TeamName.Trim(),
            City = NormaliseCity(request.City)
        };

        if (!await _teamRepository.UpdateAsync(team))
        {
            return NotFound(teamId);
        }

        _logger.LogInformation("Updated team {TeamId}.", teamId);

        // Read back rather than echoing the request: the crest is not part of an
        // edit payload, so a DTO built from the request alone would report it as
        // gone and the client would blank it out.
        var saved = await _teamRepository.GetByIdAsync(teamId);

        return saved is null
            ? NotFound(teamId)
            : ServiceResult<TeamDto>.Ok(ToDto(saved));
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int teamId)
    {
        // Teams is the parent of Players, Users (coaches) and Matches. dbo.Team_Delete
        // checks those references and deletes in one transaction, so what comes back
        // cannot be stale - and when it refuses, it says what is in the way rather
        // than letting the FK violation become a 500.
        var result = await _teamRepository.DeleteAsync(teamId);

        switch (result.Outcome)
        {
            case TeamDeleteOutcome.NotFound:
                return ServiceResult<bool>.Fail($"Team {teamId} was not found.", ServiceErrorType.NotFound);

            case TeamDeleteOutcome.Blocked:
                return ServiceResult<bool>.Fail(
                    $"Team {teamId} cannot be deleted while it still has " +
                    $"{result.PlayerCount} player(s), {result.UserCount} user account(s) " +
                    $"and {result.MatchCount} match(es) linked to it.",
                    ServiceErrorType.Conflict);
        }

        _logger.LogInformation("Deleted team {TeamId}.", teamId);
        return ServiceResult<bool>.Ok(true);
    }

    private static ServiceResult<TeamDto> NotFound(int teamId) =>
        ServiceResult<TeamDto>.Fail($"Team {teamId} was not found.", ServiceErrorType.NotFound);

    /// <summary>Treats a blank City as "not set" so it stores as NULL rather than an empty string.</summary>
    private static string? NormaliseCity(string? city) =>
        string.IsNullOrWhiteSpace(city) ? null : city.Trim();

    private static TeamDto ToDto(Team team) => new()
    {
        TeamId = team.TeamId,
        TeamName = team.TeamName,
        City = team.City,
        LogoUrl = team.LogoUrl
    };
}
