namespace ClubManager.Api.Models.Dtos;

/// <summary>Single player, including whether a login account is linked to them.</summary>
public class PlayerDetailDto
{
    public int PlayerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Position { get; set; }
    public int? JerseyNumber { get; set; }
    public int? Age { get; set; }
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;

    /// <summary>Site-relative path to the player photo. Null when none is set - render initials.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>The crest of the team above, so a profile can show it without a second request.</summary>
    public string? TeamLogoUrl { get; set; }

    /// <summary>Null when this player has no login account.</summary>
    public int? UserId { get; set; }

    public bool HasLoginAccount => UserId is not null;
}
