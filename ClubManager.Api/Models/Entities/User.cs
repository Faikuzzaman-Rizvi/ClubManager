namespace ClubManager.Api.Models.Entities;

public class User
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Admin, Coach or Player. See <see cref="Helpers.Roles"/>.</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Only meaningful for the Coach role; null for Admin and Player.</summary>
    public int? TeamId { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Site-relative path to an avatar uploaded against this account, or null.
    /// A Player account usually leaves this unset and shows their player photo
    /// instead - see <see cref="Repositories.UserWithAvatar.EffectiveAvatarUrl"/>.
    /// </summary>
    public string? AvatarUrl { get; set; }
}
