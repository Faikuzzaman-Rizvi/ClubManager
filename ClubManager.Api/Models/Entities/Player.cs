namespace ClubManager.Api.Models.Entities;

public class Player
{
    public int PlayerId { get; set; }

    /// <summary>Null unless this player also has a login account.</summary>
    public int? UserId { get; set; }

    public int TeamId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Position { get; set; }
    public int? JerseyNumber { get; set; }
    public int? Age { get; set; }
}
