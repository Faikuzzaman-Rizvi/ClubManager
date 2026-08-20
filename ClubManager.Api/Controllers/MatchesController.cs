using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>
/// Fixtures, results and goals. Every signed-in role can read; Admin may write to
/// any match, a Coach only to matches their own team is playing in.
/// </summary>
[Route("api/matches")]
[Authorize]
public class MatchesController : ApiControllerBase
{
    private readonly IMatchService _matchService;

    public MatchesController(IMatchService matchService)
    {
        _matchService = matchService;
    }

    /// <summary>Lists every match, most recent first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MatchListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MatchListItemDto>>> GetAll()
    {
        var result = await _matchService.GetAllAsync(User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>Gets a single match together with the goals recorded in it.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(MatchDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MatchDetailDto>> GetById(int id)
    {
        var result = await _matchService.GetByIdAsync(id, User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>
    /// Schedules a match. A Coach must be one of the two sides. The new match always
    /// starts as Scheduled with no score.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(MatchDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MatchDetailDto>> Create(CreateMatchRequest request)
    {
        var result = await _matchService.CreateAsync(request, User.ToCallerContext());

        if (!result.Succeeded)
        {
            return ToErrorResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.MatchId }, result.Value);
    }

    /// <summary>
    /// Replaces a match, and is how a result is entered: send both scores with
    /// Status = Completed. A Coach must be one of the two sides before and after.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(MatchDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MatchDetailDto>> Update(int id, UpdateMatchRequest request)
    {
        var result = await _matchService.UpdateAsync(id, request, User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>
    /// Records a goal. The scorer must play for one of the two teams in the match;
    /// a Coach may record either side's goals for their own team's matches.
    /// </summary>
    [HttpPost("{id:int}/goals")]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(GoalDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GoalDto>> AddGoal(int id, CreateGoalRequest request)
    {
        var result = await _matchService.AddGoalAsync(id, request, User.ToCallerContext());

        if (!result.Succeeded)
        {
            return ToErrorResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { id }, result.Value);
    }
}
