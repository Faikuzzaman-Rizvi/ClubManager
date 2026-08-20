using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>
/// Team directory. Every signed-in role can read teams; only an Admin may
/// create, edit or delete them.
/// </summary>
[Route("api/teams")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class TeamsController : ApiControllerBase
{
    private readonly ITeamService _teamService;

    public TeamsController(ITeamService teamService)
    {
        _teamService = teamService;
    }

    /// <summary>Lists every team, ordered by name.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TeamDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamDto>>> GetAll()
    {
        return Ok(await _teamService.GetAllAsync());
    }

    /// <summary>Gets a single team by id.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TeamDto>> GetById(int id)
    {
        var result = await _teamService.GetByIdAsync(id);

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>Creates a team. Admin only.</summary>
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<TeamDto>> Create(CreateTeamRequest request)
    {
        var result = await _teamService.CreateAsync(request);

        if (!result.Succeeded)
        {
            return ToErrorResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.TeamId }, result.Value);
    }

    /// <summary>Replaces a team's name and city. Admin only.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TeamDto>> Update(int id, UpdateTeamRequest request)
    {
        var result = await _teamService.UpdateAsync(id, request);

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>
    /// Deletes a team. Admin only. Refused with 409 while players, coach
    /// accounts or matches still reference the team.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _teamService.DeleteAsync(id);

        return result.Succeeded
            ? NoContent()
            : ToErrorResult(result);
    }
}
