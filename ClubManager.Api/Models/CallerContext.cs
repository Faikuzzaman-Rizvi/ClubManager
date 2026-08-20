using ClubManager.Api.Helpers;

namespace ClubManager.Api.Models;

/// <summary>
/// Who is making the call, lifted from the JWT by the controller and handed to the
/// service layer. Services scope Coach actions off <see cref="TeamId"/> here - never
/// off a team id taken from the route or request body.
/// </summary>
public class CallerContext
{
    public int UserId { get; init; }
    public string Role { get; init; } = string.Empty;

    /// <summary>The coach's own team. Null for Admin and Player.</summary>
    public int? TeamId { get; init; }

    public bool IsAdmin => Role == Roles.Admin;
    public bool IsCoach => Role == Roles.Coach;
}
