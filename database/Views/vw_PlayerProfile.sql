/*  A player with their team name, their photo, and their team's logo.

    Serves the players list, the single-player lookup and GET /api/players/me -
    all four want exactly these columns. Carrying TeamLogoUrl here is what keeps
    a squad list from making one extra request per row just to show a crest.

    Unordered: a view cannot carry ORDER BY, so PlayerRepository applies the
    sort, which lets the same view back both an ordered list and a keyed lookup.

    Depends on: dbo.Players, dbo.Teams  */
CREATE OR ALTER VIEW dbo.vw_PlayerProfile
AS
    SELECT
        p.PlayerId,
        p.UserId,
        p.TeamId,
        p.Name,
        p.Position,
        p.JerseyNumber,
        p.Age,
        p.ImageUrl,
        t.TeamName,
        t.LogoUrl AS TeamLogoUrl
    FROM dbo.Players p
    INNER JOIN dbo.Teams t ON t.TeamId = p.TeamId;
