/*  Goal counts per player, unordered - StatsRepository applies the order
    (goals desc, then name).

    No join to Matches and no status filter: goals count wherever they were
    recorded, matching the rule that goal entry is not gated on a match being
    Completed. The INNER JOIN keeps players with no goals out. TeamName and the
    crest are the scorer's CURRENT team, so a transfer moves their whole tally
    with them.

    ImageUrl and LogoUrl ride along in the GROUP BY - both are functionally
    dependent on keys already grouped, and carrying them here is what lets the
    chart render faces and crests without a request per row.

    Depends on: dbo.Goals, dbo.Players, dbo.Teams  */
CREATE OR ALTER VIEW dbo.vw_TopScorers
AS
    SELECT
        p.PlayerId,
        p.Name     AS PlayerName,
        p.ImageUrl AS PlayerImageUrl,
        p.TeamId,
        t.TeamName,
        t.LogoUrl  AS TeamLogoUrl,
        COUNT(*)   AS Goals
    FROM dbo.Goals g
    INNER JOIN dbo.Players p ON p.PlayerId = g.PlayerId
    INNER JOIN dbo.Teams   t ON t.TeamId   = p.TeamId
    GROUP BY p.PlayerId, p.Name, p.ImageUrl, p.TeamId, t.TeamName, t.LogoUrl;
