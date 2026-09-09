/*  The league table, unordered - StatsRepository applies the tie-break order
    (points, then goal difference, then goals for, then team name).

    Each completed match contributes two rows to MatchSides, one per team seen
    from that team's own point of view, so the aggregation below is a single
    GROUP BY rather than two sets of home/away CASE arithmetic.

    The score IS NOT NULL guard is deliberate belt-and-braces: the API refuses
    to mark a match Completed without both scores, but a row edited directly in
    SQL would otherwise count as Played with the comparisons silently falling
    through to a loss.

    Teams are LEFT JOINed so a team with no completed match still appears, and
    COUNT(ms.TeamId) gives it 0 rather than 1.

    LogoUrl rides along in the GROUP BY - it is functionally dependent on TeamId
    anyway, and carrying it here is what lets the table render crests without a
    second request per row.

    Covered by IX_Matches_Standings (migration 003).

    Depends on: dbo.Matches, dbo.Teams  */
CREATE OR ALTER VIEW dbo.vw_Standings
AS
    WITH MatchSides AS
    (
        SELECT HomeTeamId AS TeamId,
               HomeScore  AS GoalsFor,
               AwayScore  AS GoalsAgainst
        FROM dbo.Matches
        WHERE Status = N'Completed'
          AND HomeScore IS NOT NULL
          AND AwayScore IS NOT NULL

        UNION ALL

        SELECT AwayTeamId AS TeamId,
               AwayScore  AS GoalsFor,
               HomeScore  AS GoalsAgainst
        FROM dbo.Matches
        WHERE Status = N'Completed'
          AND HomeScore IS NOT NULL
          AND AwayScore IS NOT NULL
    )
    SELECT
        t.TeamId,
        t.TeamName,
        t.LogoUrl,
        COUNT(ms.TeamId) AS Played,
        ISNULL(SUM(CASE WHEN ms.GoalsFor >  ms.GoalsAgainst THEN 1 ELSE 0 END), 0) AS Won,
        ISNULL(SUM(CASE WHEN ms.GoalsFor =  ms.GoalsAgainst THEN 1 ELSE 0 END), 0) AS Drawn,
        ISNULL(SUM(CASE WHEN ms.GoalsFor <  ms.GoalsAgainst THEN 1 ELSE 0 END), 0) AS Lost,
        ISNULL(SUM(ms.GoalsFor), 0)                                                AS GoalsFor,
        ISNULL(SUM(ms.GoalsAgainst), 0)                                            AS GoalsAgainst,
        ISNULL(SUM(ms.GoalsFor) - SUM(ms.GoalsAgainst), 0)                         AS GoalDifference,
        ISNULL(SUM(CASE WHEN ms.GoalsFor >  ms.GoalsAgainst THEN 3
                        WHEN ms.GoalsFor =  ms.GoalsAgainst THEN 1
                        ELSE 0 END), 0)                                            AS Points
    FROM dbo.Teams t
    LEFT JOIN MatchSides ms ON ms.TeamId = t.TeamId
    GROUP BY t.TeamId, t.TeamName, t.LogoUrl;
