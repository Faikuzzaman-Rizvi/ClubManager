using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

/// <summary>
/// Schedules a fixture. A new match always starts as Scheduled with no score -
/// results are entered later through PUT /api/matches/{id}.
/// </summary>
public class CreateMatchRequest
{
    /// <summary>A Coach must be one of the two sides.</summary>
    [Required]
    public int HomeTeamId { get; set; }

    [Required]
    public int AwayTeamId { get; set; }

    [Required]
    public DateTime MatchDate { get; set; }
}
