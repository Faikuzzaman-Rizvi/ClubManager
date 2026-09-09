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

    /// <summary>
    /// Points the team at a new crest, or clears it when <paramref name="logoUrl"/>
    /// is null. Returns the URL it replaced, so the caller can delete that file.
    /// </summary>
    Task<ImageChangeResult> SetLogoAsync(int teamId, string? logoUrl);

    /// <summary>
    /// Deletes the team if nothing points at it. The check and the delete happen
    /// together inside dbo.Team_Delete, so the caller gets one answer that cannot
    /// be stale - and, when the delete is refused, the counts to explain why.
    /// </summary>
    Task<TeamDeleteResult> DeleteAsync(int teamId);
}

public enum TeamDeleteOutcome
{
    NotFound = 0,
    Deleted = 1,

    /// <summary>Rows in other tables still reference the team; see the counts.</summary>
    Blocked = 2
}

/// <summary>
/// What dbo.Team_Delete did, plus the rows pointing at the team across the tables
/// that carry an FK to Teams. The counts are only meaningful when Blocked.
/// </summary>
public class TeamDeleteResult
{
    public TeamDeleteOutcome Outcome { get; set; }
    public int PlayerCount { get; set; }
    public int UserCount { get; set; }
    public int MatchCount { get; set; }
}
