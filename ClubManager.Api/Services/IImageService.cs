using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;

namespace ClubManager.Api.Services;

/// <summary>
/// Every image write in one place: who may change which picture, and the
/// upload → store → record → clean-up sequence that follows.
///
/// <para>
/// Authorisation lives here, not in the controller attributes alone and never in
/// the database. <c>[Authorize(Roles = ...)]</c> gets the wrong role out early;
/// these methods are what stop a Coach reaching a player on another team.
/// </para>
/// </summary>
public interface IImageService
{
    /// <summary>Admin may photograph any player; a Coach only their own squad.</summary>
    Task<ServiceResult<ImageUploadResponse>> SetPlayerImageAsync(
        int playerId, IFormFile file, CallerContext caller, CancellationToken cancellationToken);

    Task<ServiceResult<ImageUploadResponse>> RemovePlayerImageAsync(int playerId, CallerContext caller);

    /// <summary>Admin only, matching who may edit a team at all.</summary>
    Task<ServiceResult<ImageUploadResponse>> SetTeamLogoAsync(
        int teamId, IFormFile file, CancellationToken cancellationToken);

    Task<ServiceResult<ImageUploadResponse>> RemoveTeamLogoAsync(int teamId);

    /// <summary>
    /// The caller's own avatar. Scoped to the UserId claim rather than a route
    /// parameter, so there is no id to tamper with.
    /// </summary>
    Task<ServiceResult<ImageUploadResponse>> SetOwnAvatarAsync(
        IFormFile file, CallerContext caller, CancellationToken cancellationToken);

    Task<ServiceResult<ImageUploadResponse>> RemoveOwnAvatarAsync(CallerContext caller);
}
