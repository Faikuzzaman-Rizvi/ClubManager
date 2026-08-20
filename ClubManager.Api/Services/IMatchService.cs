using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

public interface IMatchService
{
    /// <summary>All matches, newest first. Readable by every signed-in role.</summary>
    Task<ServiceResult<IReadOnlyList<MatchListItemDto>>> GetAllAsync(CallerContext caller);

    /// <summary>A single match plus its goals.</summary>
    Task<ServiceResult<MatchDetailDto>> GetByIdAsync(int matchId, CallerContext caller);

    Task<ServiceResult<MatchDetailDto>> CreateAsync(CreateMatchRequest request, CallerContext caller);

    /// <summary>Also the result-entry path: both scores plus Status = Completed.</summary>
    Task<ServiceResult<MatchDetailDto>> UpdateAsync(int matchId, UpdateMatchRequest request, CallerContext caller);

    Task<ServiceResult<GoalDto>> AddGoalAsync(int matchId, CreateGoalRequest request, CallerContext caller);
}
