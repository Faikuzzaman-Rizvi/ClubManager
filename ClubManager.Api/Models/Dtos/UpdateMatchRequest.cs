using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

/// <summary>
/// Full replacement of a match, and the way a result is entered: send both scores
/// with Status = Completed. A Coach must be one of the two sides both before and
/// after the change, so they cannot move a fixture away from their own team.
/// </summary>
public class UpdateMatchRequest
{
    [Required]
    public int HomeTeamId { get; set; }

    [Required]
    public int AwayTeamId { get; set; }

    [Required]
    public DateTime MatchDate { get; set; }

    /// <summary>Required when Status is Completed; must be null when Scheduled.</summary>
    [Range(0, 99)]
    public int? HomeScore { get; set; }

    [Range(0, 99)]
    public int? AwayScore { get; set; }

    /// <summary>Scheduled or Completed.</summary>
    [Required]
    public string Status { get; set; } = string.Empty;
}
