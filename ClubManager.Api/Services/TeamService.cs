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
        return ServiceResult<TeamDto>.Ok(ToDto(team));
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int teamId)
    {
        if (!await _teamRepository.ExistsAsync(teamId))
        {
            return ServiceResult<bool>.Fail($"Team {teamId} was not found.", ServiceErrorType.NotFound);
        }

        // Teams is the parent of Players, Users (coaches) and Matches. Report what
        // blocks the delete rather than letting the FK violation become a 500.
        var references = await _teamRepository.GetReferenceCountsAsync(teamId);
        if (references.HasAny)
        {
            return ServiceResult<bool>.Fail(
                $"Team {teamId} cannot be deleted while it still has " +
                $"{references.PlayerCount} player(s), {references.UserCount} user account(s) " +
                $"and {references.MatchCount} match(es) linked to it.",
                ServiceErrorType.Conflict);
        }

        if (!await _teamRepository.DeleteAsync(teamId))
        {
            // Deleted by someone else between the existence check and here.
            return ServiceResult<bool>.Fail($"Team {teamId} was not found.", ServiceErrorType.NotFound);
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
        City = team.City
    };
}
