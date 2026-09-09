using ClubManager.Api.Models.Entities;

namespace ClubManager.Api.Repositories;

public interface IUserRepository
{
    /// <summary>Every account, ordered by username. Hashes are not selected.</summary>
    Task<IReadOnlyList<UserWithAvatar>> GetAllAsync();

    Task<UserWithAvatar?> GetByUsernameAsync(string username);
    Task<UserWithAvatar?> GetByIdAsync(int userId);
    Task<UserDetail?> GetDetailByIdAsync(int userId);
    Task<string?> GetPasswordHashByIdAsync(int userId);
    Task<bool> UsernameExistsAsync(string username);
    Task<bool> UsernameExistsForOtherUserAsync(string username, int userId);

    /// <summary>Inserts the user and returns the new UserId.</summary>
    Task<int> CreateAsync(User user);

    /// <summary>Updates username, password hash (if provided), and team id.</summary>
    Task<bool> UpdateUserAsync(int userId, string username, string? passwordHash, int? teamId);

    /// <summary>
    /// Points the account at a new avatar, or clears it when <paramref name="avatarUrl"/>
    /// is null. Returns the URL it replaced, so the caller can delete that file.
    /// </summary>
    Task<ImageChangeResult> SetAvatarAsync(int userId, string? avatarUrl);

    /// <summary>
    /// The avatar the UI should draw for this account after a change - the one on
    /// the account, or the linked player photo it falls back to.
    /// </summary>
    Task<string?> GetEffectiveAvatarUrlAsync(int userId);
}

/// <summary>
/// A user row with the avatar resolved by dbo.vw_UserProfile.
/// </summary>
public class UserWithAvatar : User
{
    /// <summary>
    /// <see cref="User.AvatarUrl"/> if the account has one, otherwise the photo
    /// of the player linked to it. Computed by the view; never written back.
    /// </summary>
    public string? EffectiveAvatarUrl { get; set; }
}

/// <summary>
/// Extended user projection with team and linked player information.
/// </summary>
public class UserDetail : UserWithAvatar
{
    public string? TeamName { get; set; }
    public string? TeamLogoUrl { get; set; }
    public int? PlayerId { get; set; }
    public string? PlayerName { get; set; }
    public string? Position { get; set; }
    public int? JerseyNumber { get; set; }
    public int? Age { get; set; }
}

