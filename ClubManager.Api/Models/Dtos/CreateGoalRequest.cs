using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

public class CreateGoalRequest
{
    /// <summary>Must be a player on one of the two teams in the match.</summary>
    [Required]
    public int PlayerId { get; set; }

    /// <summary>Optional. Allows up to 130 to cover stoppage time and extra time.</summary>
    [Range(0, 130)]
    public int? Minute { get; set; }
}
