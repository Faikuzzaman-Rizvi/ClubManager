namespace ClubManager.Api.Models.Dtos;

/// <summary>One row of the top-scorer chart. Only players with at least one goal appear.</summary>
public class TopScorerDto
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;

    /// <summary>The scorer photo. Null when none is set - render initials.</summary>
    public string? PlayerImageUrl { get; set; }

    /// <summary>The player's current team.</summary>
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;

    /// <summary>That team's crest.</summary>
    public string? TeamLogoUrl { get; set; }

    public int Goals { get; set; }
}
