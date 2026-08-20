using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>
/// League table and top scorers. Read-only and fully public: CLAUDE.md section 5
/// marks these "public/all roles", so they are readable without a JWT as well as
/// by Admin, Coach and Player. Every other controller stays authenticated.
/// </summary>
[Route("api/stats")]
[AllowAnonymous]
public class StatsController : ApiControllerBase
{
    private readonly IStatsService _statsService;

    public StatsController(IStatsService statsService)
    {
        _statsService = statsService;
    }

    /// <summary>
    /// The league table. Only Completed matches count; every team is listed, so a
    /// team with no completed matches shows all zeros.
    /// </summary>
    [HttpGet("standings")]
    [ProducesResponseType(typeof(IReadOnlyList<StandingRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StandingRowDto>>> GetStandings()
    {
        return Ok(await _statsService.GetStandingsAsync());
    }

    /// <summary>
    /// Goal counts per player, highest first. Counts goals from every match
    /// regardless of status, and lists only players who have scored.
    /// </summary>
    [HttpGet("topscorers")]
    [ProducesResponseType(typeof(IReadOnlyList<TopScorerDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TopScorerDto>>> GetTopScorers()
    {
        return Ok(await _statsService.GetTopScorersAsync());
    }
}
