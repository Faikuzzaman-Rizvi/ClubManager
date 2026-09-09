/*  The login lookup.

    Returns the password hash, so it is the one read path that must not be
    reachable from anything but AuthService. Seeks on UQ_Users_Username.

    Joins dbo.vw_UserProfile back to dbo.Users rather than repeating the avatar
    fallback: the view owns that rule, and the hash stays out of the view. One
    round trip, so signing in still costs a single query even though the response
    carries the avatar the UI will draw.

    Returns: zero or one row  */
CREATE OR ALTER PROCEDURE dbo.User_GetByUsername
    @Username NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT up.UserId,
           up.Username,
           u.PasswordHash,
           up.Role,
           up.TeamId,
           up.CreatedAt,
           up.AvatarUrl,
           up.EffectiveAvatarUrl
    FROM dbo.vw_UserProfile up
    INNER JOIN dbo.Users u ON u.UserId = up.UserId
    WHERE up.Username = @Username;
END
