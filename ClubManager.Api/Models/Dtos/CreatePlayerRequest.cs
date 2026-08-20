using System.ComponentModel.DataAnnotations;

namespace ClubManager.Api.Models.Dtos;

public class CreatePlayerRequest
{
    /// <summary>A Coach may only pass their own team id.</summary>
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

    /// <summary>Optional: links an existing Player login to this record. Must be a Player-role user.</summary>
    public int? UserId { get; set; }
}
