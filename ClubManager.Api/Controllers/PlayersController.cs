using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>
/// Squad management. Admin has full reach; a Coach may only write to their own
/// team; a Player has no write access and reads only their own profile via /me.
/// </summary>
[Route("api/players")]
[Authorize]
public class PlayersController : ApiControllerBase
{
    private readonly IPlayerService _playerService;
    private readonly IImageService _imageService;

    public PlayersController(IPlayerService playerService, IImageService imageService)
    {
        _playerService = playerService;
        _imageService = imageService;
    }

    /// <summary>
    /// Lists players. Admin sees every team by default, a Coach sees their own squad.
    /// Pass ?teamId= to read a specific team - a Coach may read other squads this way.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(IReadOnlyList<PlayerListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PlayerListItemDto>>> GetAll([FromQuery] int? teamId)
    {
        var result = await _playerService.GetAllAsync(teamId, User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>The signed-in player's own profile, resolved from their UserId claim.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(PlayerDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlayerDetailDto>> GetMyProfile()
    {
        var result = await _playerService.GetMyProfileAsync(User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>Gets a single player by id.</summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(PlayerDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlayerDetailDto>> GetById(int id)
    {
        var result = await _playerService.GetByIdAsync(id, User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>Creates a player. A Coach may only create on their own team.</summary>
    [HttpPost]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(PlayerDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PlayerDetailDto>> Create(CreatePlayerRequest request)
    {
        var result = await _playerService.CreateAsync(request, User.ToCallerContext());

        if (!result.Succeeded)
        {
            return ToErrorResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.PlayerId }, result.Value);
    }

    /// <summary>Replaces a player's editable fields. A Coach may only edit their own team's players.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(PlayerDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PlayerDetailDto>> Update(int id, UpdatePlayerRequest request)
    {
        var result = await _playerService.UpdateAsync(id, request, User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>
    /// Deletes a player. A Coach may only delete their own team's players. Refused
    /// with 409 while goals are recorded against them.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _playerService.DeleteAsync(id, User.ToCallerContext());

        return result.Succeeded
            ? NoContent()
            : ToErrorResult(result);
    }
    /// <summary>
    /// Uploads or replaces the player's photo. JPG, PNG or WebP; re-encoded to
    /// WebP on the server. A Coach may only photograph their own team's players.
    /// </summary>
    [HttpPost("{id:int}/image")]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [RequestSizeLimit(UploadLimits.MaxRequestBytes)]
    [ProducesResponseType(typeof(ImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImageUploadResponse>> SetImage(
        int id, IFormFile file, CancellationToken cancellationToken)
    {
        var result = await _imageService.SetPlayerImageAsync(
            id, file, User.ToCallerContext(), cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>Removes the player's photo and deletes the stored file.</summary>
    [HttpDelete("{id:int}/image")]
    [Authorize(Roles = Roles.AdminOrCoach)]
    [ProducesResponseType(typeof(ImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImageUploadResponse>> RemoveImage(int id)
    {
        var result = await _imageService.RemovePlayerImageAsync(id, User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }
}
