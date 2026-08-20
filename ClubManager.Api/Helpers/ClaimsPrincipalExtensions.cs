using System.Security.Claims;
using ClubManager.Api.Models;

namespace ClubManager.Api.Helpers;

/// <summary>
/// Reads the claims that <see cref="Services.AuthService"/> puts in the JWT.
/// Later phases scope Coach actions by comparing <see cref="GetTeamId"/> against
/// the resource's TeamId - never trust a team id coming from the route or body.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public const string TeamIdClaim = "teamId";

    public static int? GetUserId(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static string? GetUsername(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.Name);

    public static string? GetRole(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.Role);

    /// <summary>The coach's own team. Null for Admin and Player.</summary>
    public static int? GetTeamId(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(TeamIdClaim), out var id) ? id : null;

    public static bool IsAdmin(this ClaimsPrincipal principal) =>
        principal.IsInRole(Roles.Admin);

    /// <summary>Bundles the caller claims into the object the service layer works with.</summary>
    public static CallerContext ToCallerContext(this ClaimsPrincipal principal) => new()
    {
        UserId = principal.GetUserId() ?? 0,
        Role = principal.GetRole() ?? string.Empty,
        TeamId = principal.GetTeamId()
    };
}
