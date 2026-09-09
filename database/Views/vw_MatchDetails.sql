/*  A fixture with both team names and both crests resolved.

    Serves the match list and the single-match read. Carrying both logos here is
    what lets a fixture list render crests without a second request per row.

    Unordered - MatchRepository applies the sort.

    Depends on: dbo.Matches, dbo.Teams  */
CREATE OR ALTER VIEW dbo.vw_MatchDetails
AS
    SELECT
        m.MatchId,
        m.HomeTeamId,
        h.TeamName AS HomeTeamName,
        h.LogoUrl  AS HomeTeamLogoUrl,
        m.AwayTeamId,
        a.TeamName AS AwayTeamName,
        a.LogoUrl  AS AwayTeamLogoUrl,
        m.MatchDate,
        m.HomeScore,
        m.AwayScore,
        m.Status
    FROM dbo.Matches m
    INNER JOIN dbo.Teams h ON h.TeamId = m.HomeTeamId
    INNER JOIN dbo.Teams a ON a.TeamId = m.AwayTeamId;
