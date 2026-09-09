/* =====================================================================
   003 - Indexes supporting the views and stored procedures.

   Every index here is justified against a query that actually runs. The
   second half of this file records the indexes considered and deliberately
   left out, with the reason - just as important, since an unused index is
   pure write cost.

   Indexes already created by migration 001, and what they serve:

     UQ_Users_Username        Users(Username) UNIQUE
                              -> dbo.User_GetByUsername (every login), the
                                 duplicate check in dbo.User_Create, and the
                                 ORDER BY Username on the users list.

     IX_Users_TeamId          Users(TeamId)
                              -> the coach-account count in dbo.Team_Delete.

     IX_Players_TeamId        Players(TeamId)
                              -> vw_PlayerProfile filtered by team (the
                                 players list, and a coach's own squad), and
                                 the player count in dbo.Team_Delete.

     UX_Players_UserId        Players(UserId) UNIQUE WHERE UserId IS NOT NULL
                              -> GET /api/players/me, and the link check in
                                 dbo.Player_AssertWritable. Also the rule
                                 itself: one player per login, any number of
                                 players with no login.

     IX_Matches_HomeTeamId    Matches(HomeTeamId)
     IX_Matches_AwayTeamId    Matches(AwayTeamId)
                              -> the fixture count in dbo.Team_Delete.

     IX_Goals_MatchId         Goals(MatchId)
                              -> vw_MatchGoals for one match, and the goal
                                 sweep in dbo.Match_Delete.

     IX_Goals_PlayerId        Goals(PlayerId)
                              -> vw_TopScorers (COUNT(*) GROUP BY PlayerId
                                 reads this index alone), and the blocking
                                 count in dbo.Player_Delete.
   ===================================================================== */

/* ------------------------------------------- UX_Players_Team_Jersey */
/*  Supports the jersey clash check in dbo.Player_AssertWritable, which reads
    Players by (TeamId, JerseyNumber) on every player create and update.
    IX_Players_TeamId alone narrows to the squad and then filters; this seeks
    straight to the one row.

    UNIQUE because the rule is a rule, not a preference: two players on one
    team may not wear the same number. Filtered to JerseyNumber IS NOT NULL so
    a squad may still hold any number of players with no number yet - the same
    reason UX_Players_UserId is filtered.

    Created only when the existing data already satisfies it, so adopting this
    migration never fails on a database that has drifted. Fix the duplicates it
    reports, then re-run the publish. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_Players_Team_Jersey'
                 AND object_id = OBJECT_ID('dbo.Players'))
BEGIN
    IF EXISTS (SELECT 1
               FROM dbo.Players
               WHERE JerseyNumber IS NOT NULL
               GROUP BY TeamId, JerseyNumber
               HAVING COUNT(*) > 1)
    BEGIN
        PRINT 'SKIPPED UX_Players_Team_Jersey - duplicate jersey numbers exist:';

        SELECT TeamId, JerseyNumber, COUNT(*) AS PlayerCount
        FROM dbo.Players
        WHERE JerseyNumber IS NOT NULL
        GROUP BY TeamId, JerseyNumber
        HAVING COUNT(*) > 1;
    END
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_Players_Team_Jersey
            ON dbo.Players(TeamId, JerseyNumber)
            WHERE JerseyNumber IS NOT NULL;

        PRINT 'Created UX_Players_Team_Jersey.';
    END
END
GO

/* ---------------------------------------------- IX_Matches_Standings */
/*  Covers vw_Standings, the only query that filters Matches. The view reads
    Matches twice - once per side - selecting Status, both team ids and both
    scores, so those four columns are INCLUDEd and the whole aggregation is
    served from this index without touching the table.

    Not filtered on Status = 'Completed', deliberately: a filtered index would
    make QUOTED_IDENTIFIER ON mandatory for every later write to Matches, the
    way it already is for Players, and that footgun is not worth the handful
    of Scheduled rows it would skip.

    Honest caveat: at demo-data volume (single-digit fixtures) the optimiser
    will pick a table scan whichever indexes exist. This earns its place as
    the fixture list grows, not on today's row counts. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Matches_Standings'
                 AND object_id = OBJECT_ID('dbo.Matches'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Matches_Standings
        ON dbo.Matches(Status)
        INCLUDE (HomeTeamId, AwayTeamId, HomeScore, AwayScore);

    PRINT 'Created IX_Matches_Standings.';
END
GO

/* =====================================================================
   CONSIDERED AND NOT ADDED

     Matches(MatchDate)
       The fixture list is ORDER BY MatchDate DESC, MatchId DESC over the
       WHOLE table, with every column selected and both team names joined.
       An index on MatchDate would supply the order but every row would then
       need a key lookup for the rest of the columns, which is slower than
       scanning and sorting. Nothing filters on a date range - the client
       splits played from upcoming in JavaScript - so there is no seek for
       the index to serve. Worth revisiting the day the API grows a date
       filter or paging.

     Matches(Status) on its own
       Superseded by IX_Matches_Standings above, which leads on Status and
       covers the query as well.

     Players(Name), Teams(TeamName)
       Both lists sort by name, but both are small and unfiltered, and the
       players sort is (TeamName, JerseyNumber, Name) across a join - no
       single-table index serves it. Add one when search or paging arrives.

     Goals(MatchId, PlayerId) composite
       No query filters on both. vw_MatchGoals filters on MatchId alone and
       vw_TopScorers groups by PlayerId alone; the two existing single-column
       indexes each serve their own query fully.

     Users(Role)
       Only dbo.Player_AssertWritable reads Role, and it does so alongside
       UserId - the primary key already seeks straight to that one row.
   ===================================================================== */
