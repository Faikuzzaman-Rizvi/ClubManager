using ClubManager.Api.Helpers;
using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Models.Entities;
using ClubManager.Api.Repositories;

namespace ClubManager.Api.Services;

public class PlayerService : IPlayerService
{
    private const string CoachScopeMessage =
        "Coaches can only manage players on their own team.";

    private const string CoachHasNoTeamMessage =
        "This coach account is not linked to a team.";

    private readonly IPlayerRepository _playerRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<PlayerService> _logger;

    public PlayerService(
        IPlayerRepository playerRepository,
        ITeamRepository teamRepository,
        IUserRepository userRepository,
        ILogger<PlayerService> logger)
    {
        _playerRepository = playerRepository;
        _teamRepository = teamRepository;
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<ServiceResult<IReadOnlyList<PlayerListItemDto>>> GetAllAsync(
        int? teamId, CallerContext caller)
    {
        // An explicit ?teamId= wins for everyone - a Coach may read other squads.
        // With no filter a Coach falls back to their own team; an Admin sees all.
        if (teamId is null && caller.IsCoach)
        {
            if (caller.TeamId is null)
            {
                return ServiceResult<IReadOnlyList<PlayerListItemDto>>.Fail(
                    CoachHasNoTeamMessage, ServiceErrorType.Forbidden);
            }

            teamId = caller.TeamId;
        }

        var players = await _playerRepository.GetAllAsync(teamId);

        return ServiceResult<IReadOnlyList<PlayerListItemDto>>.Ok(
            players.Select(ToListItem).ToList());
    }

    public async Task<ServiceResult<PlayerDetailDto>> GetByIdAsync(int playerId, CallerContext caller)
    {
        var player = await _playerRepository.GetByIdAsync(playerId);

        return player is null
            ? PlayerNotFound(playerId)
            : ServiceResult<PlayerDetailDto>.Ok(ToDetail(player));
    }

    public async Task<ServiceResult<PlayerDetailDto>> GetMyProfileAsync(CallerContext caller)
    {
        var player = await _playerRepository.GetByUserIdAsync(caller.UserId);

        if (player is null)
        {
            return ServiceResult<PlayerDetailDto>.Fail(
                "No player record is linked to this account.", ServiceErrorType.NotFound);
        }

        return ServiceResult<PlayerDetailDto>.Ok(ToDetail(player));
    }

    public async Task<ServiceResult<PlayerDetailDto>> CreateAsync(
        CreatePlayerRequest request, CallerContext caller)
    {
        // The scope check runs before the team lookup, so a Coach probing other team
        // ids gets 403 either way and learns nothing about which teams exist.
        var scope = CheckCoachOwnsTeam(request.TeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        if (!await _teamRepository.ExistsAsync(request.TeamId))
        {
            return TeamNotFound(request.TeamId);
        }

        var link = await ValidateUserLinkAsync(request.UserId, currentPlayerId: null);
        if (link is not null)
        {
            return link;
        }

        var jersey = await CheckJerseyAsync(request.TeamId, request.JerseyNumber, excludePlayerId: null);
        if (jersey is not null)
        {
            return jersey;
        }

        var player = new Player
        {
            UserId = request.UserId,
            TeamId = request.TeamId,
            Name = request.Name.Trim(),
            Position = Normalise(request.Position),
            JerseyNumber = request.JerseyNumber,
            Age = request.Age
        };

        var playerId = await _playerRepository.CreateAsync(player);
        _logger.LogInformation("Created player {PlayerId} on team {TeamId}.", playerId, player.TeamId);

        return await ReloadAsync(playerId);
    }

    public async Task<ServiceResult<PlayerDetailDto>> UpdateAsync(
        int playerId, UpdatePlayerRequest request, CallerContext caller)
    {
        var existing = await _playerRepository.GetByIdAsync(playerId);
        if (existing is null)
        {
            return PlayerNotFound(playerId);
        }

        // A Coach must own the player as they stand today...
        var scope = CheckCoachOwnsTeam(existing.TeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        // ...and may not transfer them onto some other team.
        scope = CheckCoachOwnsTeam(request.TeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        if (!await _teamRepository.ExistsAsync(request.TeamId))
        {
            return TeamNotFound(request.TeamId);
        }

        var link = await ValidateUserLinkAsync(request.UserId, currentPlayerId: playerId);
        if (link is not null)
        {
            return link;
        }

        var jersey = await CheckJerseyAsync(request.TeamId, request.JerseyNumber, excludePlayerId: playerId);
        if (jersey is not null)
        {
            return jersey;
        }

        var player = new Player
        {
            PlayerId = playerId,
            UserId = request.UserId,
            TeamId = request.TeamId,
            Name = request.Name.Trim(),
            Position = Normalise(request.Position),
            JerseyNumber = request.JerseyNumber,
            Age = request.Age
        };

        if (!await _playerRepository.UpdateAsync(player))
        {
            return PlayerNotFound(playerId);
        }

        _logger.LogInformation("Updated player {PlayerId}.", playerId);
        return await ReloadAsync(playerId);
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int playerId, CallerContext caller)
    {
        var existing = await _playerRepository.GetByIdAsync(playerId);
        if (existing is null)
        {
            return ServiceResult<bool>.Fail($"Player {playerId} was not found.", ServiceErrorType.NotFound);
        }

        if (caller.IsCoach)
        {
            if (caller.TeamId is null)
            {
                return ServiceResult<bool>.Fail(CoachHasNoTeamMessage, ServiceErrorType.Forbidden);
            }

            if (existing.TeamId != caller.TeamId)
            {
                return ServiceResult<bool>.Fail(CoachScopeMessage, ServiceErrorType.Forbidden);
            }
        }

        // Goals has an FK to Players. dbo.Player_Delete counts and deletes in one
        // transaction, so it reports the blocker instead of surfacing a 500.
        var result = await _playerRepository.DeleteAsync(playerId);

        switch (result.Outcome)
        {
            case PlayerDeleteOutcome.NotFound:
                return ServiceResult<bool>.Fail($"Player {playerId} was not found.", ServiceErrorType.NotFound);

            case PlayerDeleteOutcome.Blocked:
                return ServiceResult<bool>.Fail(
                    $"Player {playerId} cannot be deleted while {result.GoalCount} goal(s) are recorded against them.",
                    ServiceErrorType.Conflict);
        }

        _logger.LogInformation("Deleted player {PlayerId}.", playerId);
        return ServiceResult<bool>.Ok(true);
    }

    /// <summary>
    /// Returns a failed result when a Coach is reaching outside their own team, or
    /// null when the caller may proceed. Admins always pass.
    /// </summary>
    private static ServiceResult<PlayerDetailDto>? CheckCoachOwnsTeam(int teamId, CallerContext caller)
    {
        if (!caller.IsCoach)
        {
            return null;
        }

        if (caller.TeamId is null)
        {
            return ServiceResult<PlayerDetailDto>.Fail(CoachHasNoTeamMessage, ServiceErrorType.Forbidden);
        }

        return teamId == caller.TeamId.Value
            ? null
            : ServiceResult<PlayerDetailDto>.Fail(CoachScopeMessage, ServiceErrorType.Forbidden);
    }

    /// <summary>Checks an optional login link: the user must exist, be a Player, and be unclaimed.</summary>
    private async Task<ServiceResult<PlayerDetailDto>?> ValidateUserLinkAsync(int? userId, int? currentPlayerId)
    {
        if (userId is null)
        {
            return null;
        }

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user is null)
        {
            return ServiceResult<PlayerDetailDto>.Fail(
                $"User {userId.Value} was not found.", ServiceErrorType.NotFound);
        }

        if (user.Role != Roles.Player)
        {
            return ServiceResult<PlayerDetailDto>.Fail(
                $"User {userId.Value} has the {user.Role} role; only a Player login can be linked to a player record.");
        }

        var linked = await _playerRepository.GetByUserIdAsync(userId.Value);
        if (linked is not null && linked.PlayerId != currentPlayerId)
        {
            return ServiceResult<PlayerDetailDto>.Fail(
                $"User {userId.Value} is already linked to player {linked.PlayerId}.",
                ServiceErrorType.Conflict);
        }

        return null;
    }

    /// <summary>Jersey numbers are unique within a team; an unset number is always allowed.</summary>
    private async Task<ServiceResult<PlayerDetailDto>?> CheckJerseyAsync(
        int teamId, int? jerseyNumber, int? excludePlayerId)
    {
        if (jerseyNumber is null)
        {
            return null;
        }

        var taken = await _playerRepository.JerseyNumberTakenAsync(teamId, jerseyNumber.Value, excludePlayerId);

        return taken
            ? ServiceResult<PlayerDetailDto>.Fail(
                $"Jersey number {jerseyNumber.Value} is already taken on team {teamId}.",
                ServiceErrorType.Conflict)
            : null;
    }

    private async Task<ServiceResult<PlayerDetailDto>> ReloadAsync(int playerId)
    {
        var saved = await _playerRepository.GetByIdAsync(playerId);

        return saved is null
            ? PlayerNotFound(playerId)
            : ServiceResult<PlayerDetailDto>.Ok(ToDetail(saved));
    }

    private static ServiceResult<PlayerDetailDto> PlayerNotFound(int playerId) =>
        ServiceResult<PlayerDetailDto>.Fail($"Player {playerId} was not found.", ServiceErrorType.NotFound);

    private static ServiceResult<PlayerDetailDto> TeamNotFound(int teamId) =>
        ServiceResult<PlayerDetailDto>.Fail($"Team {teamId} was not found.", ServiceErrorType.NotFound);

    private static string? Normalise(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static PlayerListItemDto ToListItem(PlayerWithTeam player) => new()
    {
        PlayerId = player.PlayerId,
        Name = player.Name,
        Position = player.Position,
        JerseyNumber = player.JerseyNumber,
        Age = player.Age,
        TeamId = player.TeamId,
        TeamName = player.TeamName,
        TeamLogoUrl = player.TeamLogoUrl,
        ImageUrl = player.ImageUrl,
        UserId = player.UserId
    };

    private static PlayerDetailDto ToDetail(PlayerWithTeam player) => new()
    {
        PlayerId = player.PlayerId,
        Name = player.Name,
        Position = player.Position,
        JerseyNumber = player.JerseyNumber,
        Age = player.Age,
        TeamId = player.TeamId,
        TeamName = player.TeamName,
        TeamLogoUrl = player.TeamLogoUrl,
        ImageUrl = player.ImageUrl,
        UserId = player.UserId
    };
}
