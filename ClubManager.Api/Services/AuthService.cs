using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ClubManager.Api.Helpers;
using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Models.Entities;
using ClubManager.Api.Repositories;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ClubManager.Api.Services;

public class AuthService : IAuthService
{
    /// <summary>BCrypt cost. Matches the work factor used for the seeded admin hash.</summary>
    private const int BcryptWorkFactor = 12;

    private readonly IUserRepository _userRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        ITeamRepository teamRepository,
        IOptions<JwtSettings> jwtSettings,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _teamRepository = teamRepository;
        _jwtSettings = jwtSettings.Value;
        _logger = logger;
    }

    public async Task<ServiceResult<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByUsernameAsync(request.Username);

        // Same message and roughly the same work either way, so the response
        // does not reveal whether the username exists.
        if (user is null)
        {
            _ = VerifyPassword(request.Password, DummyHash);
            return ServiceResult<AuthResponse>.Fail(
                "Invalid username or password.", ServiceErrorType.Unauthorized);
        }

        if (!VerifyPassword(request.Password, user.PasswordHash))
        {
            _logger.LogInformation("Failed login attempt for user {Username}.", user.Username);
            return ServiceResult<AuthResponse>.Fail(
                "Invalid username or password.", ServiceErrorType.Unauthorized);
        }

        var (token, expiresAtUtc) = CreateToken(user);

        return ServiceResult<AuthResponse>.Ok(new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            User = ToDto(user)
        });
    }

    public async Task<ServiceResult<UserDto>> RegisterAsync(RegisterRequest request)
    {
        var role = request.Role?.Trim() ?? string.Empty;

        // Admins are seeded by script, so this endpoint only mints Coach and Player logins.
        if (!role.Equals(Roles.Coach, StringComparison.OrdinalIgnoreCase) &&
            !role.Equals(Roles.Player, StringComparison.OrdinalIgnoreCase))
        {
            return ServiceResult<UserDto>.Fail(
                $"Role must be '{Roles.Coach}' or '{Roles.Player}'.");
        }

        // Normalise to the exact casing the CK_Users_Role constraint expects.
        role = role.Equals(Roles.Coach, StringComparison.OrdinalIgnoreCase) ? Roles.Coach : Roles.Player;

        // Users.TeamId is only meaningful for a Coach.
        if (role == Roles.Coach)
        {
            if (request.TeamId is null)
            {
                return ServiceResult<UserDto>.Fail("A Coach must be assigned a TeamId.");
            }

            if (!await _teamRepository.ExistsAsync(request.TeamId.Value))
            {
                return ServiceResult<UserDto>.Fail(
                    $"Team {request.TeamId.Value} does not exist.", ServiceErrorType.NotFound);
            }
        }
        else if (request.TeamId is not null)
        {
            return ServiceResult<UserDto>.Fail(
                "TeamId only applies to the Coach role. A Player's team comes from the Players table.");
        }

        var username = request.Username.Trim();

        if (await _userRepository.UsernameExistsAsync(username))
        {
            return ServiceResult<UserDto>.Fail(
                $"Username '{username}' is already taken.", ServiceErrorType.Conflict);
        }

        var user = new User
        {
            Username = username,
            PasswordHash = HashPassword(request.Password),
            Role = role,
            TeamId = role == Roles.Coach ? request.TeamId : null
        };

        user.UserId = await _userRepository.CreateAsync(user);
        _logger.LogInformation("Created {Role} account {Username} (UserId {UserId}).",
            user.Role, user.Username, user.UserId);

        return ServiceResult<UserDto>.Ok(ToDto(user));
    }

    private (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role)
        };

        // Coach-scoped authorisation reads this claim instead of trusting the request.
        if (user.TeamId is not null)
        {
            claims.Add(new Claim(ClaimsPrincipalExtensions.TeamIdClaim, user.TeamId.Value.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }

    private static UserDto ToDto(User user) => new()
    {
        UserId = user.UserId,
        Username = user.Username,
        Role = user.Role,
        TeamId = user.TeamId
    };

    private static string HashPassword(string password) =>
        BCrypt.Net.BCrypt.HashPassword(password, BcryptWorkFactor);

    private static bool VerifyPassword(string password, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // Stored hash is malformed (hand-edited row); treat as a failed login.
            return false;
        }
    }

    /// <summary>
    /// Hash of a throwaway value, verified against when the username is unknown so an
    /// unknown user costs the same time as a wrong password. Built once per process.
    /// </summary>
    private static readonly string DummyHash =
        BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString(), BcryptWorkFactor);
}
