namespace ClubManager.Api.Models.Dtos;

public class TeamDto
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string? City { get; set; }
}
