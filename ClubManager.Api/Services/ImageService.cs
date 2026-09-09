using ClubManager.Api.Helpers;
using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Repositories;

namespace ClubManager.Api.Services;

public class ImageService : IImageService
{
    private const string CoachScopeMessage =
        "Coaches can only manage photos of players on their own team.";

    private const string CoachHasNoTeamMessage =
        "This coach account is not linked to a team.";

    private readonly IPlayerRepository _playerRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly IUserRepository _userRepository;
    private readonly IImageStorage _storage;
    private readonly ILogger<ImageService> _logger;

    public ImageService(
        IPlayerRepository playerRepository,
        ITeamRepository teamRepository,
        IUserRepository userRepository,
        IImageStorage storage,
        ILogger<ImageService> logger)
    {
        _playerRepository = playerRepository;
        _teamRepository = teamRepository;
        _userRepository = userRepository;
        _storage = storage;
        _logger = logger;
    }

    /* ------------------------------------------------------------- players */

    public async Task<ServiceResult<ImageUploadResponse>> SetPlayerImageAsync(
        int playerId, IFormFile file, CallerContext caller, CancellationToken cancellationToken)
    {
        var player = await _playerRepository.GetByIdAsync(playerId);
        if (player is null)
        {
            return PlayerNotFound(playerId);
        }

        var scope = CheckCoachOwnsTeam(player.TeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        // Stored only after the caller is known to be allowed to change this
        // player, so a rejected request never leaves a file behind.
        var saved = await _storage.SaveAsync(file, ImageKind.PlayerPhoto, cancellationToken);
        if (!saved.Succeeded)
        {
            return ServiceResult<ImageUploadResponse>.Fail(saved.Error!);
        }

        var change = await _playerRepository.SetImageAsync(playerId, saved.RelativeUrl);

        if (!change.Found)
        {
            // Deleted between the read above and the write. Take the orphan with it.
            _storage.Delete(saved.RelativeUrl);
            return PlayerNotFound(playerId);
        }

        _storage.Delete(change.PreviousUrl);
        _logger.LogInformation("Set the photo for player {PlayerId}.", playerId);

        return Ok(saved.RelativeUrl);
    }

    public async Task<ServiceResult<ImageUploadResponse>> RemovePlayerImageAsync(
        int playerId, CallerContext caller)
    {
        var player = await _playerRepository.GetByIdAsync(playerId);
        if (player is null)
        {
            return PlayerNotFound(playerId);
        }

        var scope = CheckCoachOwnsTeam(player.TeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        var change = await _playerRepository.SetImageAsync(playerId, null);
        if (!change.Found)
        {
            return PlayerNotFound(playerId);
        }

        _storage.Delete(change.PreviousUrl);
        _logger.LogInformation("Removed the photo for player {PlayerId}.", playerId);

        return Ok(null);
    }

    /* --------------------------------------------------------------- teams */

    public async Task<ServiceResult<ImageUploadResponse>> SetTeamLogoAsync(
        int teamId, IFormFile file, CancellationToken cancellationToken)
    {
        if (!await _teamRepository.ExistsAsync(teamId))
        {
            return TeamNotFound(teamId);
        }

        var saved = await _storage.SaveAsync(file, ImageKind.TeamLogo, cancellationToken);
        if (!saved.Succeeded)
        {
            return ServiceResult<ImageUploadResponse>.Fail(saved.Error!);
        }

        var change = await _teamRepository.SetLogoAsync(teamId, saved.RelativeUrl);

        if (!change.Found)
        {
            _storage.Delete(saved.RelativeUrl);
            return TeamNotFound(teamId);
        }

        _storage.Delete(change.PreviousUrl);
        _logger.LogInformation("Set the crest for team {TeamId}.", teamId);

        return Ok(saved.RelativeUrl);
    }

    public async Task<ServiceResult<ImageUploadResponse>> RemoveTeamLogoAsync(int teamId)
    {
        var change = await _teamRepository.SetLogoAsync(teamId, null);
        if (!change.Found)
        {
            return TeamNotFound(teamId);
        }

        _storage.Delete(change.PreviousUrl);
        _logger.LogInformation("Removed the crest for team {TeamId}.", teamId);

        return Ok(null);
    }

    /* ------------------------------------------------------------ own user */

    public async Task<ServiceResult<ImageUploadResponse>> SetOwnAvatarAsync(
        IFormFile file, CallerContext caller, CancellationToken cancellationToken)
    {
        return await SetUserAvatarAsync(caller.UserId, file, caller, cancellationToken);
    }

    public async Task<ServiceResult<ImageUploadResponse>> RemoveOwnAvatarAsync(CallerContext caller)
    {
        return await RemoveUserAvatarAsync(caller.UserId, caller);
    }

    public async Task<ServiceResult<ImageUploadResponse>> SetUserAvatarAsync(
        int userId, IFormFile file, CallerContext caller, CancellationToken cancellationToken)
    {
        if (!caller.IsAdmin && caller.UserId != userId)
        {
            return ServiceResult<ImageUploadResponse>.Fail(
                "You do not have permission to change this avatar.", ServiceErrorType.Forbidden);
        }

        var saved = await _storage.SaveAsync(file, ImageKind.UserAvatar, cancellationToken);
        if (!saved.Succeeded)
        {
            return ServiceResult<ImageUploadResponse>.Fail(saved.Error!);
        }

        var change = await _userRepository.SetAvatarAsync(userId, saved.RelativeUrl);

        if (!change.Found)
        {
            _storage.Delete(saved.RelativeUrl);
            return ServiceResult<ImageUploadResponse>.Fail(
                "This account no longer exists.", ServiceErrorType.NotFound);
        }

        _storage.Delete(change.PreviousUrl);
        _logger.LogInformation("Set the avatar for user {UserId}.", userId);

        return Ok(saved.RelativeUrl);
    }

    public async Task<ServiceResult<ImageUploadResponse>> RemoveUserAvatarAsync(int userId, CallerContext caller)
    {
        if (!caller.IsAdmin && caller.UserId != userId)
        {
            return ServiceResult<ImageUploadResponse>.Fail(
                "You do not have permission to remove this avatar.", ServiceErrorType.Forbidden);
        }

        var change = await _userRepository.SetAvatarAsync(userId, null);
        if (!change.Found)
        {
            return ServiceResult<ImageUploadResponse>.Fail(
                "This account no longer exists.", ServiceErrorType.NotFound);
        }

        _storage.Delete(change.PreviousUrl);
        _logger.LogInformation("Removed the avatar for user {UserId}.", userId);

        return Ok(await _userRepository.GetEffectiveAvatarUrlAsync(userId));
    }


    /* --------------------------------------------------------------- plumbing */

    /// <summary>
    /// Returns a failed result when a Coach is reaching outside their own team,
    /// or null when the caller may proceed. Admins always pass.
    /// </summary>
    private static ServiceResult<ImageUploadResponse>? CheckCoachOwnsTeam(int teamId, CallerContext caller)
    {
        if (!caller.IsCoach)
        {
            return null;
        }

        if (caller.TeamId is null)
        {
            return ServiceResult<ImageUploadResponse>.Fail(CoachHasNoTeamMessage, ServiceErrorType.Forbidden);
        }

        return teamId == caller.TeamId.Value
            ? null
            : ServiceResult<ImageUploadResponse>.Fail(CoachScopeMessage, ServiceErrorType.Forbidden);
    }

    private static ServiceResult<ImageUploadResponse> Ok(string? imageUrl) =>
        ServiceResult<ImageUploadResponse>.Ok(new ImageUploadResponse { ImageUrl = imageUrl });

    private static ServiceResult<ImageUploadResponse> PlayerNotFound(int playerId) =>
        ServiceResult<ImageUploadResponse>.Fail($"Player {playerId} was not found.", ServiceErrorType.NotFound);

    private static ServiceResult<ImageUploadResponse> TeamNotFound(int teamId) =>
        ServiceResult<ImageUploadResponse>.Fail($"Team {teamId} was not found.", ServiceErrorType.NotFound);
}
