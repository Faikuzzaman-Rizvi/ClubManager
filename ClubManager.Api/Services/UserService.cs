using ClubManager.Api.Helpers;
using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Repositories;

namespace ClubManager.Api.Services;

public class UserService : IUserService
{
    private const int BcryptWorkFactor = 12;

    private readonly IUserRepository _userRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly IPlayerRepository _playerRepository;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository userRepository,
        ITeamRepository teamRepository,
        IPlayerRepository playerRepository,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _teamRepository = teamRepository;
        _playerRepository = playerRepository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync()
    {
        var users = await _userRepository.GetAllAsync();

        return users.Select(user => new UserDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Role = user.Role,
            TeamId = user.TeamId,
            AvatarUrl = user.EffectiveAvatarUrl,
            HasOwnAvatar = user.AvatarUrl is not null
        }).ToList();
    }

    public async Task<ServiceResult<UserDetailDto>> GetByIdAsync(int userId, CallerContext caller)
    {
        if (!caller.IsAdmin && caller.UserId != userId)
        {
            return ServiceResult<UserDetailDto>.Fail(
                "You do not have permission to view this profile.", ServiceErrorType.Forbidden);
        }

        var detail = await _userRepository.GetDetailByIdAsync(userId);
        if (detail is null)
        {
            return ServiceResult<UserDetailDto>.Fail(
                $"User {userId} was not found.", ServiceErrorType.NotFound);
        }

        return ServiceResult<UserDetailDto>.Ok(ToDetailDto(detail));
    }

    public async Task<ServiceResult<UserDetailDto>> GetMyProfileAsync(CallerContext caller)
    {
        var detail = await _userRepository.GetDetailByIdAsync(caller.UserId);
        if (detail is null)
        {
            return ServiceResult<UserDetailDto>.Fail(
                "User account was not found.", ServiceErrorType.NotFound);
        }

        return ServiceResult<UserDetailDto>.Ok(ToDetailDto(detail));
    }

    public async Task<ServiceResult<UserDetailDto>> UpdateMyProfileAsync(
        UpdateMyProfileRequest request, CallerContext caller)
    {
        var username = request.Username?.Trim() ?? string.Empty;
        if (username.Length < 3 || username.Length > 50)
        {
            return ServiceResult<UserDetailDto>.Fail(
                "Username must be between 3 and 50 characters.");
        }

        if (await _userRepository.UsernameExistsForOtherUserAsync(username, caller.UserId))
        {
            return ServiceResult<UserDetailDto>.Fail(
                $"Username '{username}' is already taken.", ServiceErrorType.Conflict);
        }

        string? newPasswordHash = null;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (request.NewPassword.Length < 6)
            {
                return ServiceResult<UserDetailDto>.Fail(
                    "New password must be at least 6 characters.");
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return ServiceResult<UserDetailDto>.Fail(
                    "Current password is required to set a new password.");
            }

            var currentHash = await _userRepository.GetPasswordHashByIdAsync(caller.UserId);
            if (currentHash is null || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, currentHash))
            {
                return ServiceResult<UserDetailDto>.Fail(
                    "Current password is incorrect.", ServiceErrorType.Validation);
            }

            newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, BcryptWorkFactor);
        }

        var existing = await _userRepository.GetDetailByIdAsync(caller.UserId);
        if (existing is null)
        {
            return ServiceResult<UserDetailDto>.Fail("User was not found.", ServiceErrorType.NotFound);
        }

        await _userRepository.UpdateUserAsync(caller.UserId, username, newPasswordHash, existing.TeamId);
        _logger.LogInformation("User {UserId} updated their profile.", caller.UserId);

        var updated = await _userRepository.GetDetailByIdAsync(caller.UserId);
        return ServiceResult<UserDetailDto>.Ok(ToDetailDto(updated!));
    }

    public async Task<ServiceResult<UserDetailDto>> UpdateAsync(
        int userId, UpdateUserRequest request, CallerContext caller)
    {
        if (!caller.IsAdmin)
        {
            return ServiceResult<UserDetailDto>.Fail(
                "Only an Administrator can update user profiles.", ServiceErrorType.Forbidden);
        }

        var existing = await _userRepository.GetDetailByIdAsync(userId);
        if (existing is null)
        {
            return ServiceResult<UserDetailDto>.Fail(
                $"User {userId} was not found.", ServiceErrorType.NotFound);
        }

        var username = request.Username?.Trim() ?? string.Empty;
        if (username.Length < 3 || username.Length > 50)
        {
            return ServiceResult<UserDetailDto>.Fail(
                "Username must be between 3 and 50 characters.");
        }

        if (await _userRepository.UsernameExistsForOtherUserAsync(username, userId))
        {
            return ServiceResult<UserDetailDto>.Fail(
                $"Username '{username}' is already taken.", ServiceErrorType.Conflict);
        }

        string? newPasswordHash = null;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (request.NewPassword.Length < 6)
            {
                return ServiceResult<UserDetailDto>.Fail(
                    "Password must be at least 6 characters.");
            }

            newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, BcryptWorkFactor);
        }

        int? teamId = existing.TeamId;
        if (existing.Role == Roles.Coach)
        {
            if (request.TeamId.HasValue)
            {
                if (!await _teamRepository.ExistsAsync(request.TeamId.Value))
                {
                    return ServiceResult<UserDetailDto>.Fail(
                        $"Team {request.TeamId.Value} does not exist.", ServiceErrorType.NotFound);
                }
                teamId = request.TeamId.Value;
            }
        }
        else
        {
            teamId = null;
        }

        await _userRepository.UpdateUserAsync(userId, username, newPasswordHash, teamId);

        // If this user is a Player with a linked record, update player fields if supplied
        if (existing.PlayerId.HasValue)
        {
            var player = await _playerRepository.GetByIdAsync(existing.PlayerId.Value);
            if (player is not null)
            {
                bool playerChanged = false;
                if (!string.IsNullOrWhiteSpace(request.PlayerName) && request.PlayerName != player.Name)
                {
                    player.Name = request.PlayerName.Trim();
                    playerChanged = true;
                }
                if (!string.IsNullOrWhiteSpace(request.Position) && request.Position != player.Position)
                {
                    player.Position = request.Position.Trim();
                    playerChanged = true;
                }
                if (request.JerseyNumber.HasValue && request.JerseyNumber.Value != player.JerseyNumber)
                {
                    player.JerseyNumber = request.JerseyNumber.Value;
                    playerChanged = true;
                }
                if (request.Age.HasValue && request.Age.Value != player.Age)
                {
                    player.Age = request.Age.Value;
                    playerChanged = true;
                }

                if (playerChanged)
                {
                    await _playerRepository.UpdateAsync(player);
                }
            }
        }

        _logger.LogInformation("Admin {AdminId} updated user {UserId} profile.", caller.UserId, userId);

        var updated = await _userRepository.GetDetailByIdAsync(userId);
        return ServiceResult<UserDetailDto>.Ok(ToDetailDto(updated!));
    }

    private static UserDetailDto ToDetailDto(UserDetail detail) => new()
    {
        UserId = detail.UserId,
        Username = detail.Username,
        Role = detail.Role,
        TeamId = detail.TeamId,
        TeamName = detail.TeamName,
        TeamLogoUrl = detail.TeamLogoUrl,
        CreatedAt = detail.CreatedAt,
        AvatarUrl = detail.EffectiveAvatarUrl,
        HasOwnAvatar = detail.AvatarUrl is not null,
        PlayerId = detail.PlayerId,
        PlayerName = detail.PlayerName,
        Position = detail.Position,
        JerseyNumber = detail.JerseyNumber,
        Age = detail.Age
    };
}
