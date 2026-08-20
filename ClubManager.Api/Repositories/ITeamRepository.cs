using ClubManager.Api.Models.Entities;

namespace ClubManager.Api.Repositories;

public interface ITeamRepository
{
    Task<IReadOnlyList<Team>> GetAllAsync();

    Task<Team?> GetByIdAsync(int teamId);

    /// <summary>Cheap existence probe used when validating a Coach's TeamId.</summary>
    Task<bool> ExistsAsync(int teamId);

    /// <summary>Inserts the team and returns the new TeamId.</summary>
    Task<int> CreateAsync(Team team);

    /// <summary>Returns false when no row matched the given TeamId.</summary>
    Task<bool> UpdateAsync(Team team);

    /// <summary>Returns false when no row matched the given TeamId.</summary>
    Task<bool> DeleteAsync(int teamId);

    /// <summary>
    /// Counts the rows that reference this team. Checked before a delete so a
    /// blocked delete reports what is in the way instead of surfacing an FK error.
    /// </summary>
    Task<TeamReferenceCounts> GetReferenceCountsAsync(int teamId);
}

/// <summary>Rows pointing at a team, across the tables that carry an FK to Teams.</summary>
public class TeamReferenceCounts
{
    public int PlayerCount { get; set; }
    public int UserCount { get; set; }
    public int MatchCount { get; set; }

    public bool HasAny => PlayerCount > 0 || UserCount > 0 || MatchCount > 0;
}
