using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

public interface IPlayerService
{
    /// <summary>Admin sees every team by default; a Coach defaults to their own squad.</summary>
    Task<ServiceResult<IReadOnlyList<PlayerListItemDto>>> GetAllAsync(int? teamId, CallerContext caller);

    Task<ServiceResult<PlayerDetailDto>> GetByIdAsync(int playerId, CallerContext caller);

    /// <summary>Resolves the caller UserId claim to their own player record.</summary>
    Task<ServiceResult<PlayerDetailDto>> GetMyProfileAsync(CallerContext caller);

    Task<ServiceResult<PlayerDetailDto>> CreateAsync(CreatePlayerRequest request, CallerContext caller);
    Task<ServiceResult<PlayerDetailDto>> UpdateAsync(int playerId, UpdatePlayerRequest request, CallerContext caller);
    Task<ServiceResult<bool>> DeleteAsync(int playerId, CallerContext caller);
}
