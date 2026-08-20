namespace ClubManager.Api.Models.Dtos;

/// <summary>User data safe to return to a client - never carries the password hash.</summary>
public class UserDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? TeamId { get; set; }
}
