using ClubManager.Api.Helpers;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>
/// User account directory. Admin only - exists so the admin screens can offer
/// "link a Player login" pickers. Password hashes never leave the repository.
/// </summary>
[Route("api/users")]
[Authorize(Roles = Roles.Admin)]
public class UsersController : ApiControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>Lists every user account. Admin only.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll()
    {
        return Ok(await _userService.GetAllAsync());
    }
}
