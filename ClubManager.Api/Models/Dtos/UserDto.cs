namespace ClubManager.Api.Models.Dtos;

/// <summary>User data safe to return to a client - never carries the password hash.</summary>
public class UserDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? TeamId { get; set; }

    /// <summary>
    /// The avatar the UI should draw: the one uploaded against this account, or
    /// failing that the linked player photo. Null when neither exists.
    /// </summary>
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// True when <see cref="AvatarUrl"/> was uploaded against this account, false
    /// when it is the linked player photo showing through. Lets the UI offer
    /// "remove" only when there is something of the account's own to remove.
    /// </summary>
    public bool HasOwnAvatar { get; set; }
}
