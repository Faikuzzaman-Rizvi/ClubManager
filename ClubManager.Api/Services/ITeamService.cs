using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

public interface ITeamService
{
    Task<IReadOnlyList<TeamDto>> GetAllAsync();
    Task<ServiceResult<TeamDto>> GetByIdAsync(int teamId);
    Task<ServiceResult<TeamDto>> CreateAsync(CreateTeamRequest request);
    Task<ServiceResult<TeamDto>> UpdateAsync(int teamId, UpdateTeamRequest request);
    Task<ServiceResult<bool>> DeleteAsync(int teamId);
}
