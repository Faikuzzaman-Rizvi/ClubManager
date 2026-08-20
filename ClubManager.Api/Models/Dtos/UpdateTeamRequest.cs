using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

/// <summary>Full replacement of a team's editable fields - omitted City clears it.</summary>
public class UpdateTeamRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string TeamName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? City { get; set; }
}
