/*  A login account with the avatar the UI should actually draw.

    A Player account normally has no avatar of its own - their face is already on
    their player record - so EffectiveAvatarUrl falls back to the linked player's
    photo. An avatar uploaded against the account itself always wins, which is
    what lets any user override the fallback.

    The LEFT JOIN is one row at most: UX_Players_UserId makes Players.UserId
    unique among the rows that have one.

    Deliberately WITHOUT PasswordHash. This view backs the admin user list and
    the account lookups, so the hash must not be reachable through it -
    dbo.User_GetByUsername joins back to dbo.Users for that, and is the only
    read that returns it.

    Unordered - UserRepository applies the sort.

    Depends on: dbo.Users, dbo.Players  */
CREATE OR ALTER VIEW dbo.vw_UserProfile
AS
    SELECT
        u.UserId,
        u.Username,
        u.Role,
        u.TeamId,
        u.CreatedAt,
        u.AvatarUrl,
        p.PlayerId,
        p.ImageUrl AS PlayerImageUrl,
        COALESCE(u.AvatarUrl, p.ImageUrl) AS EffectiveAvatarUrl
    FROM dbo.Users u
    LEFT JOIN dbo.Players p ON p.UserId = u.UserId;
