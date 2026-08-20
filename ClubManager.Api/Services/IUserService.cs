using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

public interface IUserService
{
    /// <summary>All user accounts, as DTOs that never carry the password hash.</summary>
    Task<IReadOnlyList<UserDto>> GetAllAsync();
}
