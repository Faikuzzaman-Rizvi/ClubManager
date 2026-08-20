namespace ClubManager.Api.Models.Dtos;

/// <summary>Row shape for the squad/player list screens.</summary>
public class PlayerListItemDto
{
    public int PlayerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Position { get; set; }
    public int? JerseyNumber { get; set; }
    public int? Age { get; set; }
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;

    /// <summary>Null when this player has no login account.</summary>
    public int? UserId { get; set; }

    public bool HasLoginAccount => UserId is not null;
}
