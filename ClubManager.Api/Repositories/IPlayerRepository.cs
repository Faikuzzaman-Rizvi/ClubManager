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

    /// <summary>Returns false when no row matched the given PlayerId.</summary>
    Task<bool> DeleteAsync(int playerId);

    /// <summary>
    /// True when another player on the same team already wears this number.
    /// <paramref name="excludePlayerId"/> keeps an update from clashing with itself.
    /// </summary>
    Task<bool> JerseyNumberTakenAsync(int teamId, int jerseyNumber, int? excludePlayerId);

    /// <summary>Goals scored by this player - checked before a delete, since Goals has an FK to Players.</summary>
    Task<int> GetGoalCountAsync(int playerId);
}

/// <summary>A player row joined to its team, so list and detail views can show the team name.</summary>
public class PlayerWithTeam : Player
{
    public string TeamName { get; set; } = string.Empty;
}
