namespace ClubManager.Api.Models.Dtos;

/// <summary>
/// One league-table row. Every team appears, including those with no completed
/// matches yet, which show as all zeros.
/// </summary>
public class StandingRowDto
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;

    /// <summary>Site-relative path to the club crest. Null when none is set.</summary>
    public string? LogoUrl { get; set; }

    public int Played { get; set; }
    public int Won { get; set; }
    public int Drawn { get; set; }
    public int Lost { get; set; }

    /// <summary>From Matches.HomeScore/AwayScore - deliberately independent of the Goals table.</summary>
    public int GoalsFor { get; set; }
    public int GoalsAgainst { get; set; }
    public int GoalDifference { get; set; }

    /// <summary>3 for a win, 1 for a draw, 0 for a loss.</summary>
    public int Points { get; set; }
}
