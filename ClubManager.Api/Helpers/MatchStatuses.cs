namespace ClubManager.Api.Helpers;

/// <summary>The two values allowed by the CK_Matches_Status check constraint.</summary>
public static class MatchStatuses
{
    public const string Scheduled = "Scheduled";
    public const string Completed = "Completed";

    public static bool IsValid(string? status) =>
        status is Scheduled or Completed;
}
