using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Repositories;

namespace ClubManager.Api.Services;

/// <summary>
/// Read-only pass-through: the ordering and the arithmetic live in SQL, so this
/// only maps the aggregate rows onto the response contract.
/// </summary>
public class StatsService : IStatsService
{
    private readonly IStatsRepository _statsRepository;

    public StatsService(IStatsRepository statsRepository)
    {
        _statsRepository = statsRepository;
    }

    public async Task<IReadOnlyList<StandingRowDto>> GetStandingsAsync()
    {
        var rows = await _statsRepository.GetStandingsAsync();
        return rows.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<TopScorerDto>> GetTopScorersAsync()
    {
        var rows = await _statsRepository.GetTopScorersAsync();
        return rows.Select(ToDto).ToList();
    }

    private static StandingRowDto ToDto(TeamStandingRow row) => new()
    {
        TeamId = row.TeamId,
        TeamName = row.TeamName,
        LogoUrl = row.LogoUrl,
        Played = row.Played,
        Won = row.Won,
        Drawn = row.Drawn,
        Lost = row.Lost,
        GoalsFor = row.GoalsFor,
        GoalsAgainst = row.GoalsAgainst,
        GoalDifference = row.GoalDifference,
        Points = row.Points
    };

    private static TopScorerDto ToDto(TopScorerRow row) => new()
    {
        PlayerId = row.PlayerId,
        PlayerName = row.PlayerName,
        PlayerImageUrl = row.PlayerImageUrl,
        TeamId = row.TeamId,
        TeamName = row.TeamName,
        TeamLogoUrl = row.TeamLogoUrl,
        Goals = row.Goals
    };
}
