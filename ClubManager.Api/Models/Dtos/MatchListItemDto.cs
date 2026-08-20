namespace ClubManager.Api.Models.Dtos;

/// <summary>Row shape for fixture and result lists.</summary>
public class MatchListItemDto
{
    public int MatchId { get; set; }
    public int HomeTeamId { get; set; }
    public string HomeTeamName { get; set; } = string.Empty;
    public int AwayTeamId { get; set; }
    public string AwayTeamName { get; set; } = string.Empty;
    public DateTime MatchDate { get; set; }

    /// <summary>Null until the result is entered.</summary>
    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }

    /// <summary>Scheduled or Completed.</summary>
    public string Status { get; set; } = string.Empty;
}
