using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Repositories;

namespace ClubManager.Api.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync()
    {
        var users = await _userRepository.GetAllAsync();

        return users.Select(user => new UserDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Role = user.Role,
            TeamId = user.TeamId,
            AvatarUrl = user.EffectiveAvatarUrl,
            HasOwnAvatar = user.AvatarUrl is not null
        }).ToList();
    }
}
