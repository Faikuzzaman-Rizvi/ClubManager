/* =====================================================================
   ClubManager - demo data set.

   IDEMPOTENCY: clear-and-reseed. Every run DELETES all Teams, Players,
   Matches and Goals, and all non-Admin Users, then inserts the same fixed
   set with the same ids. Re-running always lands on identical state.

   >>> DESTRUCTIVE. Anything you created by hand is wiped, apart from Admin
   >>> logins, which are preserved (this script never touches Role='Admin').

   Demo logins - all share the password  Demo@123
     coach.arsenal   Coach   -> Arsenal
     coach.everton   Coach   -> Everton
     coach.chelsea   Coach   -> Chelsea
     player.saka     Player  -> linked to Bukayo Saka (Arsenal)
     player.pickford Player  -> linked to Jordan Pickford (Everton)

   The bootstrap admin from Seed/001_AdminAccount.sql keeps its own password.

   NOT part of a normal publish. Run it explicitly:
     dotnet run --project ClubManager.Database -- --demo-data
   ===================================================================== */

SET NOCOUNT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    /* ---------------------------------------------- wipe, in FK order */
    DELETE FROM dbo.Goals;
    DELETE FROM dbo.Matches;
    DELETE FROM dbo.Players;
    DELETE FROM dbo.Users WHERE Role <> N'Admin';
    DELETE FROM dbo.Teams;

    /* Admin ids must not be disturbed, so the demo users take plain identity
       values rather than IDENTITY_INSERT. Reseeding to the highest surviving
       Admin id keeps their ids the same on every run instead of climbing. */
    DECLARE @MaxAdminUserId INT = (SELECT ISNULL(MAX(UserId), 0) FROM dbo.Users);
    DBCC CHECKIDENT ('dbo.Users', RESEED, @MaxAdminUserId) WITH NO_INFOMSGS;

    /* ------------------------------------------------------- 6 teams */
    SET IDENTITY_INSERT dbo.Teams ON;

    INSERT INTO dbo.Teams (TeamId, TeamName, City) VALUES
        (1, N'Arsenal',          N'London'),
        (2, N'Everton',          N'Liverpool'),
        (3, N'Chelsea',          N'London'),
        (4, N'Newcastle United', N'Newcastle'),
        (5, N'Brighton',         N'Brighton'),
        (6, N'Aston Villa',      N'Birmingham');

    SET IDENTITY_INSERT dbo.Teams OFF;

    /* ------------------------------------------------- demo accounts */
    /* BCrypt (work factor 12) of 'Demo@123'. One salt reused across the
       demo users on purpose - it keeps the script to a single constant. */
    DECLARE @DemoHash NVARCHAR(255) =
        N'$2a$12$8XVga/c8J6N0IdhSoU3.G.pdkeeGb23fCMa8TJBXyj7.BASXnELJO';

    DECLARE @PlayerSakaUserId     INT;
    DECLARE @PlayerPickfordUserId INT;

    /* Users.TeamId is only meaningful for a Coach. */
    INSERT INTO dbo.Users (Username, PasswordHash, Role, TeamId)
    VALUES (N'coach.arsenal', @DemoHash, N'Coach', 1),
           (N'coach.everton', @DemoHash, N'Coach', 2),
           (N'coach.chelsea', @DemoHash, N'Coach', 3);

    INSERT INTO dbo.Users (Username, PasswordHash, Role, TeamId)
    VALUES (N'player.saka', @DemoHash, N'Player', NULL);
    SET @PlayerSakaUserId = SCOPE_IDENTITY();

    INSERT INTO dbo.Users (Username, PasswordHash, Role, TeamId)
    VALUES (N'player.pickford', @DemoHash, N'Player', NULL);
    SET @PlayerPickfordUserId = SCOPE_IDENTITY();

    /* ---------------------------------------------------- 27 players */
    /* Jersey numbers are unique within a team; two players are left with
       NULL to exercise the "no squad number yet" case. Only the two
       players above carry a UserId - the rest have no login. */
    SET IDENTITY_INSERT dbo.Players ON;

    INSERT INTO dbo.Players (PlayerId, UserId, TeamId, Name, Position, JerseyNumber, Age) VALUES
        -- Arsenal
        ( 1, NULL,                  1, N'David Raya',            N'Goalkeeper',   1, 30),
        ( 2, NULL,                  1, N'William Saliba',        N'Defender',     2, 24),
        ( 3, NULL,                  1, N'Declan Rice',           N'Midfielder',  41, 27),
        ( 4, @PlayerSakaUserId,     1, N'Bukayo Saka',           N'Winger',       7, 24),
        ( 5, NULL,                  1, N'Kai Havertz',           N'Forward',     29, 27),
        -- Everton
        ( 6, @PlayerPickfordUserId, 2, N'Jordan Pickford',       N'Goalkeeper',   1, 32),
        ( 7, NULL,                  2, N'James Tarkowski',       N'Defender',     6, 33),
        ( 8, NULL,                  2, N'Idrissa Gueye',         N'Midfielder',  27, 36),
        ( 9, NULL,                  2, N'Dominic Calvert-Lewin', N'Forward',      9, 29),
        (10, NULL,                  2, N'Harry Boyd',            N'Forward',   NULL, 18),
        -- Chelsea
        (11, NULL,                  3, N'Robert Sanchez',        N'Goalkeeper',   1, 28),
        (12, NULL,                  3, N'Levi Colwill',          N'Defender',     6, 23),
        (13, NULL,                  3, N'Enzo Fernandez',        N'Midfielder',   8, 25),
        (14, NULL,                  3, N'Cole Palmer',           N'Midfielder',  20, 24),
        (15, NULL,                  3, N'Nicolas Jackson',       N'Forward',     15, 25),
        -- Newcastle United
        (16, NULL,                  4, N'Nick Pope',             N'Goalkeeper',  22, 34),
        (17, NULL,                  4, N'Sven Botman',           N'Defender',     4, 26),
        (18, NULL,                  4, N'Bruno Guimaraes',       N'Midfielder',  39, 28),
        (19, NULL,                  4, N'Alexander Isak',        N'Forward',     14, 26),
        -- Brighton
        (20, NULL,                  5, N'Bart Verbruggen',       N'Goalkeeper',   1, 24),
        (21, NULL,                  5, N'Lewis Dunk',            N'Defender',     5, 34),
        (22, NULL,                  5, N'Kaoru Mitoma',          N'Winger',      22, 29),
        (23, NULL,                  5, N'Tom Ashcroft',          N'Midfielder', NULL, 19),
        -- Aston Villa
        (24, NULL,                  6, N'Emiliano Martinez',     N'Goalkeeper',   1, 33),
        (25, NULL,                  6, N'Ezri Konsa',            N'Defender',     4, 28),
        (26, NULL,                  6, N'John McGinn',           N'Midfielder',   7, 31),
        (27, NULL,                  6, N'Ollie Watkins',         N'Forward',     11, 30);

    SET IDENTITY_INSERT dbo.Players OFF;

    /* ----------------------------------------------------- 8 matches */
    /* Five Completed across five different pairings, three still
       Scheduled. Completed rows always carry both scores - the standings
       query skips a Completed row with a NULL score. */
    SET IDENTITY_INSERT dbo.Matches ON;

    INSERT INTO dbo.Matches (MatchId, HomeTeamId, AwayTeamId, MatchDate, HomeScore, AwayScore, Status) VALUES
        (1, 1, 2, '2026-08-15T15:00:00', 3,    1,    N'Completed'),  -- Arsenal 3-1 Everton
        (2, 3, 4, '2026-08-22T17:30:00', 2,    2,    N'Completed'),  -- Chelsea 2-2 Newcastle
        (3, 5, 1, '2026-08-29T15:00:00', 0,    2,    N'Completed'),  -- Brighton 0-2 Arsenal
        (4, 2, 6, '2026-09-05T15:00:00', 1,    0,    N'Completed'),  -- Everton 1-0 Villa
        (5, 4, 5, '2026-09-12T20:00:00', 4,    1,    N'Completed'),  -- Newcastle 4-1 Brighton
        (6, 1, 3, '2026-12-05T15:00:00', NULL, NULL, N'Scheduled'),  -- Arsenal v Chelsea
        (7, 6, 4, '2026-12-12T15:00:00', NULL, NULL, N'Scheduled'),  -- Villa v Newcastle
        (8, 2, 5, '2026-12-19T15:00:00', NULL, NULL, N'Scheduled');  -- Everton v Brighton

    SET IDENTITY_INSERT dbo.Matches OFF;

    /* ------------------------------------------------------ 17 goals */
    /* Every scorer plays for one of the two sides in their match. Goal
       counts add up to the recorded scores, though the API does not
       require that - scores come from Matches, tallies from Goals.
       Goal 17 sits on a still-Scheduled match, which is valid: goal entry
       is not gated on match status, so it counts toward top scorers
       while contributing nothing to the standings. */
    SET IDENTITY_INSERT dbo.Goals ON;

    INSERT INTO dbo.Goals (GoalId, MatchId, PlayerId, Minute) VALUES
        -- M1 Arsenal 3-1 Everton
        ( 1, 1,  4, 12),   -- Saka
        ( 2, 1,  5, 34),   -- Havertz
        ( 3, 1,  4, 71),   -- Saka
        ( 4, 1,  9, 88),   -- Calvert-Lewin
        -- M2 Chelsea 2-2 Newcastle
        ( 5, 2, 14, 23),   -- Palmer
        ( 6, 2, 19, 40),   -- Isak
        ( 7, 2, 15, 55),   -- Jackson
        ( 8, 2, 18, 79),   -- Guimaraes
        -- M3 Brighton 0-2 Arsenal
        ( 9, 3,  4, 18),   -- Saka
        (10, 3,  3, 66),   -- Rice
        -- M4 Everton 1-0 Aston Villa
        (11, 4,  9, 51),   -- Calvert-Lewin
        -- M5 Newcastle 4-1 Brighton
        (12, 5, 19,  9),   -- Isak
        (13, 5, 19, 27),   -- Isak
        (14, 5, 22, 45),   -- Mitoma
        (15, 5, 19, 63),   -- Isak
        (16, 5, 18, 80),   -- Guimaraes
        -- M8 Everton v Brighton - STILL SCHEDULED
        (17, 8,  9, 12);   -- Calvert-Lewin

    SET IDENTITY_INSERT dbo.Goals OFF;

    COMMIT TRANSACTION;
    PRINT 'Demo data loaded.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    PRINT 'Demo data FAILED - nothing was changed.';
    THROW;
END CATCH
GO

/* Identity seeds, so rows added later through the API continue from here.
   Outside the transaction: DBCC CHECKIDENT is not rolled back. */
DBCC CHECKIDENT ('dbo.Teams',   RESEED,  6) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Players', RESEED, 27) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Matches', RESEED,  8) WITH NO_INFOMSGS;
DBCC CHECKIDENT ('dbo.Goals',   RESEED, 17) WITH NO_INFOMSGS;
GO

SELECT 'Teams'   AS TableName, COUNT(*) AS Rows FROM dbo.Teams
UNION ALL SELECT 'Users',      COUNT(*) FROM dbo.Users
UNION ALL SELECT 'Players',    COUNT(*) FROM dbo.Players
UNION ALL SELECT 'Matches',    COUNT(*) FROM dbo.Matches
UNION ALL SELECT 'Goals',      COUNT(*) FROM dbo.Goals;
GO
