namespace ClubManager.Api.Models.Entities;

public class Match
{
    public int MatchId { get; set; }
    public int HomeTeamId { get; set; }
    public int AwayTeamId { get; set; }
    public DateTime MatchDate { get; set; }
    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }

    /// <summary>Scheduled or Completed.</summary>
    public string Status { get; set; } = "Scheduled";
}
