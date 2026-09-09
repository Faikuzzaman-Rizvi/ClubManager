using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

public class UpdateMyProfileRequest
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    public string? CurrentPassword { get; set; }

    [StringLength(100, MinimumLength = 6)]
    public string? NewPassword { get; set; }
}
