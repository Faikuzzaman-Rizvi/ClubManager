using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

public interface IAuthService
{
    Task<ServiceResult<AuthResponse>> LoginAsync(LoginRequest request);

    /// <summary>Admin-only: creates a Coach or Player login.</summary>
    Task<ServiceResult<UserDto>> RegisterAsync(RegisterRequest request);
}
