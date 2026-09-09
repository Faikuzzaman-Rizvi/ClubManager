/*  A goal with its scorer and the scorer's CURRENT team, including the scorer's
    photo and that team's crest.

    Serves the goals list on a match and the read-back after a goal is recorded.
    Unordered - MatchRepository applies the sort, which is what puts untimed
    goals after the timed ones rather than before.

    Depends on: dbo.Goals, dbo.Players, dbo.Teams  */
CREATE OR ALTER VIEW dbo.vw_MatchGoals
AS
    SELECT
        g.GoalId,
        g.MatchId,
        g.PlayerId,
        p.Name     AS PlayerName,
        p.ImageUrl AS PlayerImageUrl,
        p.TeamId,
        t.TeamName,
        t.LogoUrl  AS TeamLogoUrl,
        g.Minute
    FROM dbo.Goals g
    INNER JOIN dbo.Players p ON p.PlayerId = g.PlayerId
    INNER JOIN dbo.Teams   t ON t.TeamId   = p.TeamId;
