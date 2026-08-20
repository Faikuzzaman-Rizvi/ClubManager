using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

public interface IStatsService
{
    /// <summary>The league table, ordered by points then goal difference then goals for then name.</summary>
    Task<IReadOnlyList<StandingRowDto>> GetStandingsAsync();

    /// <summary>Goal counts per player, highest first.</summary>
    Task<IReadOnlyList<TopScorerDto>> GetTopScorersAsync();
}
