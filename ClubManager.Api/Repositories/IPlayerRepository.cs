using ClubManager.Api.Models.Entities;

namespace ClubManager.Api.Repositories;

public interface IPlayerRepository
{
    /// <summary>All players, or just one team's when <paramref name="teamId"/> is supplied.</summary>
    Task<IReadOnlyList<PlayerWithTeam>> GetAllAsync(int? teamId);

    Task<PlayerWithTeam?> GetByIdAsync(int playerId);

    /// <summary>Resolves a login account to its player record. Null when nothing is linked.</summary>
    Task<PlayerWithTeam?> GetByUserIdAsync(int userId);

    /// <summary>Inserts the player and returns the new PlayerId.</summary>
    Task<int> CreateAsync(Player player);

    /// <summary>Returns false when no row matched the given PlayerId.</summary>
    Task<bool> UpdateAsync(Player player);

    /// <summary>
    /// Deletes the player unless goals are recorded against them. The count and the
    /// delete happen together inside dbo.Player_Delete, so the caller gets one answer
    /// that cannot be stale - and, when the delete is refused, the tally to explain why.
    /// </summary>
    Task<PlayerDeleteResult> DeleteAsync(int playerId);

    /// <summary>
    /// Points the player at a new photo, or clears it when <paramref name="imageUrl"/>
    /// is null. Returns the URL it replaced, so the caller can delete that file.
    /// </summary>
    Task<ImageChangeResult> SetImageAsync(int playerId, string? imageUrl);

    /// <summary>
    /// True when another player on the same team already wears this number.
    /// <paramref name="excludePlayerId"/> keeps an update from clashing with itself.
    /// </summary>
    Task<bool> JerseyNumberTakenAsync(int teamId, int jerseyNumber, int? excludePlayerId);
}

public enum PlayerDeleteOutcome
{
    NotFound = 0,
    Deleted = 1,

    /// <summary>Goals still reference the player; see the count.</summary>
    Blocked = 2
}

/// <summary>
/// What dbo.Player_Delete did, plus the goals recorded against the player. The
/// count is only meaningful when Blocked.
/// </summary>
public class PlayerDeleteResult
{
    public PlayerDeleteOutcome Outcome { get; set; }
    public int GoalCount { get; set; }
}

/// <summary>A player row joined to its team, so list and detail views can show the team name.</summary>
public class PlayerWithTeam : Player
{
    public string TeamName { get; set; } = string.Empty;

    /// <summary>The team crest, so a squad list can draw it without a second request.</summary>
    public string? TeamLogoUrl { get; set; }
}
