namespace ClubManager.Api.Repositories;

/// <summary>Read-only aggregation over Matches and Goals. No write paths.</summary>
public interface IStatsRepository
{
    /// <summary>
    /// The league table, already sorted: points, then goal difference, then goals
    /// scored, then team name. Includes teams with no completed matches.
    /// </summary>
    Task<IReadOnlyList<TeamStandingRow>> GetStandingsAsync();

    /// <summary>
    /// Goal counts per player, most goals first then name. Players with no goals
    /// are left out.
    /// </summary>
    Task<IReadOnlyList<TopScorerRow>> GetTopScorersAsync();
}

public class TeamStandingRow
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int Played { get; set; }
    public int Won { get; set; }
    public int Drawn { get; set; }
    public int Lost { get; set; }
    public int GoalsFor { get; set; }
    public int GoalsAgainst { get; set; }
    public int GoalDifference { get; set; }
    public int Points { get; set; }
}

public class TopScorerRow
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int Goals { get; set; }
}
