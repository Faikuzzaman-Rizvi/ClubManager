namespace ClubManager.Api.Models.Entities;

public class Team
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string? City { get; set; }
}
