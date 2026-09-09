using ClubManager.Api.Models.Entities;

namespace ClubManager.Api.Repositories;

public interface IMatchRepository
{
    Task<IReadOnlyList<MatchWithTeams>> GetAllAsync();

    Task<MatchWithTeams?> GetByIdAsync(int matchId);

    /// <summary>Inserts the match and returns the new MatchId.</summary>
    Task<int> CreateAsync(Match match);

    /// <summary>Returns false when no row matched the given MatchId.</summary>
    Task<bool> UpdateAsync(Match match);

    /// <summary>Goals recorded in a match, earliest minute first.</summary>
    Task<IReadOnlyList<GoalWithPlayer>> GetGoalsAsync(int matchId);

    /// <summary>Inserts the goal and returns the new GoalId.</summary>
    Task<int> AddGoalAsync(Goal goal);

    /// <summary>Reads back one goal with its scorer and team, for the create response.</summary>
    Task<GoalWithPlayer?> GetGoalByIdAsync(int goalId);
}

/// <summary>A match row joined to both team names.</summary>
public class MatchWithTeams : Match
{
    public string HomeTeamName { get; set; } = string.Empty;
    public string? HomeTeamLogoUrl { get; set; }

    public string AwayTeamName { get; set; } = string.Empty;
    public string? AwayTeamLogoUrl { get; set; }
}

/// <summary>A goal row joined to the scorer and the scorer's team.</summary>
public class GoalWithPlayer : Goal
{
    public string PlayerName { get; set; } = string.Empty;
    public string? PlayerImageUrl { get; set; }

    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string? TeamLogoUrl { get; set; }
}
