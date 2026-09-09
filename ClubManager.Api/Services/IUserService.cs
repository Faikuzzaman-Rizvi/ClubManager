using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

public interface IUserService
{
    /// <summary>All user accounts, as DTOs that never carry the password hash.</summary>
    Task<IReadOnlyList<UserDto>> GetAllAsync();

    /// <summary>Detailed profile for a specific user. Admin or user themselves.</summary>
    Task<ServiceResult<UserDetailDto>> GetByIdAsync(int userId, CallerContext caller);

    /// <summary>Detailed profile for the signed-in caller.</summary>
    Task<ServiceResult<UserDetailDto>> GetMyProfileAsync(CallerContext caller);

    /// <summary>Updates the caller's own profile (username and optionally password).</summary>
    Task<ServiceResult<UserDetailDto>> UpdateMyProfileAsync(UpdateMyProfileRequest request, CallerContext caller);

    /// <summary>Admin-only: updates any user's profile, credentials, team or player details.</summary>
    Task<ServiceResult<UserDetailDto>> UpdateAsync(int userId, UpdateUserRequest request, CallerContext caller);
}

