using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

/// <summary>Admin-only payload for creating a Coach or Player login.</summary>
public class RegisterRequest
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    /// <summary>Coach or Player. Admin accounts are seeded by script, not created here.</summary>
    [Required]
    public string Role { get; set; } = string.Empty;

    /// <summary>Required for Coach, must be omitted for Player.</summary>
    public int? TeamId { get; set; }
}
