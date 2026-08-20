using ClubManager.Api.Models.Entities;

namespace ClubManager.Api.Repositories;

public interface IUserRepository
{
    /// <summary>Every account, ordered by username. Hashes are not selected.</summary>
    Task<IReadOnlyList<User>> GetAllAsync();

    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByIdAsync(int userId);
    Task<bool> UsernameExistsAsync(string username);

    /// <summary>Inserts the user and returns the new UserId.</summary>
    Task<int> CreateAsync(User user);
}
