using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

public class CreateTeamRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string TeamName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? City { get; set; }
}
