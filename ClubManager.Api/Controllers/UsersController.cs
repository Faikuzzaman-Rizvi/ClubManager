using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>
/// User accounts and profile management.
/// </summary>
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

    /// <summary>Returns the signed-in caller's detailed profile.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailDto>> GetMyProfile()
    {
        var result = await _userService.GetMyProfileAsync(User.ToCallerContext());
        return result.Succeeded ? Ok(result.Value) : ToErrorResult(result);
    }

    /// <summary>Updates the signed-in caller's profile (username, password).</summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDetailDto>> UpdateMyProfile([FromBody] UpdateMyProfileRequest request)
    {
        var result = await _userService.UpdateMyProfileAsync(request, User.ToCallerContext());
        return result.Succeeded ? Ok(result.Value) : ToErrorResult(result);
    }

    /// <summary>Gets a specific user's detailed profile. Admin or self.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailDto>> GetById(int id)
    {
        var result = await _userService.GetByIdAsync(id, User.ToCallerContext());
        return result.Succeeded ? Ok(result.Value) : ToErrorResult(result);
    }

    /// <summary>Updates any user's profile details. Admin only.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDetailDto>> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var result = await _userService.UpdateAsync(id, request, User.ToCallerContext());
        return result.Succeeded ? Ok(result.Value) : ToErrorResult(result);
    }

    /// <summary>
    /// Uploads or replaces the signed-in caller's own avatar.
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
    /// Removes the caller's own avatar.
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

    /// <summary>
    /// Uploads or replaces a user's avatar. Admin or the user themselves.
    /// </summary>
    [HttpPost("{id:int}/avatar")]
    [RequestSizeLimit(UploadLimits.MaxRequestBytes)]
    [ProducesResponseType(typeof(ImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ImageUploadResponse>> SetUserAvatar(
        int id, IFormFile file, CancellationToken cancellationToken)
    {
        var result = await _imageService.SetUserAvatarAsync(
            id, file, User.ToCallerContext(), cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }

    /// <summary>
    /// Removes a user's avatar. Admin or the user themselves.
    /// </summary>
    [HttpDelete("{id:int}/avatar")]
    [ProducesResponseType(typeof(ImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ImageUploadResponse>> RemoveUserAvatar(int id)
    {
        var result = await _imageService.RemoveUserAvatarAsync(id, User.ToCallerContext());

        return result.Succeeded
            ? Ok(result.Value)
            : ToErrorResult(result);
    }
}
