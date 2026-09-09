namespace ClubManager.Api.Models.Dtos;

/// <summary>
/// Detailed user profile DTO, encompassing account details, role, assigned team,
/// and linked player details if applicable.
/// </summary>
public class UserDetailDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? TeamId { get; set; }
    public string? TeamName { get; set; }
    public string? TeamLogoUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? AvatarUrl { get; set; }
    public bool HasOwnAvatar { get; set; }

    // Linked player information (when user is a Player with a linked record)
    public int? PlayerId { get; set; }
    public string? PlayerName { get; set; }
    public string? Position { get; set; }
    public int? JerseyNumber { get; set; }
    public int? Age { get; set; }
}
