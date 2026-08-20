namespace ClubManager.Api.Models.Dtos;

/// <summary>A single match plus the goals recorded in it.</summary>
public class MatchDetailDto : MatchListItemDto
{
    public IReadOnlyList<GoalDto> Goals { get; set; } = Array.Empty<GoalDto>();
}
