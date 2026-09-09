namespace ClubManager.Api.Models.Dtos;

public class GoalDto
{
    public int GoalId { get; set; }
    public int MatchId { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;

    /// <summary>The scorer photo. Null when none is set.</summary>
    public string? PlayerImageUrl { get; set; }

    /// <summary>The scorer's current team - always one of the two sides in the match.</summary>
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;

    /// <summary>That team's crest.</summary>
    public string? TeamLogoUrl { get; set; }

    public int? Minute { get; set; }
}
