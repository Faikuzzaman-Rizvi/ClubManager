using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

public class UpdateUserRequest
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [StringLength(100, MinimumLength = 6)]
    public string? NewPassword { get; set; }

    public int? TeamId { get; set; }

    public string? PlayerName { get; set; }
    public string? Position { get; set; }
    public int? JerseyNumber { get; set; }
    public int? Age { get; set; }
}
