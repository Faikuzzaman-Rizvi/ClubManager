namespace ClubManager.Api.Models.Entities;

public class Team
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string? City { get; set; }

    /// <summary>
    /// Site-relative path to the club crest, or null when none is set. Written
    /// only by dbo.Team_SetLogo - a rename never touches it.
    /// </summary>
    public string? LogoUrl { get; set; }
}
