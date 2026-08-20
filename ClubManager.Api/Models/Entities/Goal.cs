namespace ClubManager.Api.Models.Entities;

public class Goal
{
    public int GoalId { get; set; }
    public int MatchId { get; set; }
    public int PlayerId { get; set; }
    public int? Minute { get; set; }
}
