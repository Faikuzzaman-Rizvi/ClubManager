using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

/// <summary>Full replacement of a player's editable fields - an omitted optional field clears it.</summary>
public class UpdatePlayerRequest
{
    /// <summary>A Coach may only pass their own team id, so they cannot transfer a player away.</summary>
    [Required]
    public int TeamId { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(30)]
    public string? Position { get; set; }

    [Range(1, 99)]
    public int? JerseyNumber { get; set; }

    [Range(14, 70)]
    public int? Age { get; set; }

    /// <summary>Optional: links an existing Player login. Passing null clears the link.</summary>
    public int? UserId { get; set; }
}
