using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>
/// User accounts. The directory is Admin only - it exists so the admin screens
/// can offer "link a Player login" pickers - while the /me endpoints below are
/// each caller's own and open to any signed-in role. Password hashes never leave
/// the repository.
/// </summary>
/// <remarks>
/// The Admin restriction sits on the action rather than the controller: a
/// second <c>[Authorize]</c> would be ANDed with a class-level one, so a
/// class-wide Admin requirement could not be relaxed for /me.
/// </remarks>
[Route("api/users")]
[Authorize]
public class UsersController : ApiControllerBase
{
    private readonly IUserService _userService;
    private readonly IImageService _imageService;

    public UsersController(IUserService userService, IImageService imageService)
    {
        _userService = userService;
        _imageService = imageService;
    }

    /// <summary>Lists every user account. Admin only.</summary>
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(IReadOnlyList<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll()
    {
        return Ok(await _userService.GetAllAsync());
    }

    /// <summary>
    /// Uploads or replaces the signed-in caller's own avatar. Any role. The
    /// account is taken from the token, so there is no id to tamper with.
    /// </summary>
    [HttpPost("me/avatar")]
    [RequestSizeLimit(UploadLimits.MaxRequestBytes)]
    [ProducesResponseType(typeof(ImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ImageUploadResponse>> SetOwnAvatar(
        IFormFile file, CancellationToken cancellationToken)
    {
        var result = await _imageService.SetOwnAvatarAsync(
            file, User.ToCallerContext(), cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>
    /// Removes the caller's own avatar. For a Player this reveals their player
    /// photo again rather than clearing the picture outright, so the response
    /// carries whatever the UI should now draw.
    /// </summary>
    [HttpDelete("me/avatar")]
    [ProducesResponseType(typeof(ImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ImageUploadResponse>> RemoveOwnAvatar()
    {
        var result = await _imageService.RemoveOwnAvatarAsync(User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }
}
