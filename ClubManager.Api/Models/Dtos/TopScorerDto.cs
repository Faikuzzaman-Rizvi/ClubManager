namespace ClubManager.Api.Models.Dtos;

/// <summary>One row of the top-scorer chart. Only players with at least one goal appear.</summary>
public class TopScorerDto
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;

    /// <summary>The player's current team.</summary>
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;

    public int Goals { get; set; }
}
