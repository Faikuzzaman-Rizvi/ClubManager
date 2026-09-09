namespace ClubManager.Api.Models.Dtos;

public class TeamDto
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string? City { get; set; }

    /// <summary>Site-relative path to the club crest. Null when none is set - render initials.</summary>
    public string? LogoUrl { get; set; }
}
