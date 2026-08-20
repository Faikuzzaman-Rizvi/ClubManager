namespace ClubManager.Api.Helpers;

/// <summary>
/// The three roles allowed by the CK_Users_Role check constraint.
/// Declared as consts so they can be used in [Authorize(Roles = ...)].
/// </summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string Coach = "Coach";
    public const string Player = "Player";

    public const string AdminOrCoach = Admin + "," + Coach;

    public static bool IsValid(string? role) =>
        role is Admin or Coach or Player;
}
