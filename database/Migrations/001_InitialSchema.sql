/* =====================================================================
   001 - Initial schema: the five base tables with their keys, foreign
   keys, check constraints and the indexes those relationships need.

   Every object is guarded, so this migration is also the safe way to adopt
   migration tracking on a database that already has these tables: it runs,
   changes nothing, and gets recorded as applied.

   The publisher owns the database itself (it creates it if missing) and the
   session options, so there is no CREATE DATABASE, no USE, and no SET
   QUOTED_IDENTIFIER here. See database/README.md.
   ===================================================================== */

/* ---------------------------------------------------------------- Teams */
IF OBJECT_ID('dbo.Teams', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Teams (
        TeamId   INT IDENTITY(1,1) NOT NULL,
        TeamName NVARCHAR(100)     NOT NULL,
        City     NVARCHAR(100)     NULL,
        CONSTRAINT PK_Teams PRIMARY KEY (TeamId)
    );
END
GO

/* ---------------------------------------------------------------- Users */
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserId       INT IDENTITY(1,1) NOT NULL,
        Username     NVARCHAR(50)      NOT NULL,
        PasswordHash NVARCHAR(255)     NOT NULL,
        Role         NVARCHAR(20)      NOT NULL,
        TeamId       INT               NULL,   -- only meaningful for Role = 'Coach'
        CreatedAt    DATETIME          NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_Users          PRIMARY KEY (UserId),
        CONSTRAINT UQ_Users_Username UNIQUE (Username),
        CONSTRAINT CK_Users_Role     CHECK (Role IN ('Admin','Coach','Player')),
        CONSTRAINT FK_Users_Teams    FOREIGN KEY (TeamId) REFERENCES dbo.Teams(TeamId)
    );

    CREATE INDEX IX_Users_TeamId ON dbo.Users(TeamId);
END
GO

/* -------------------------------------------------------------- Players */
IF OBJECT_ID('dbo.Players', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Players (
        PlayerId     INT IDENTITY(1,1) NOT NULL,
        UserId       INT               NULL,   -- null unless the player has a login
        TeamId       INT               NOT NULL,
        Name         NVARCHAR(100)     NOT NULL,
        Position     NVARCHAR(30)      NULL,
        JerseyNumber INT               NULL,
        Age          INT               NULL,
        CONSTRAINT PK_Players       PRIMARY KEY (PlayerId),
        CONSTRAINT FK_Players_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_Players_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(TeamId)
    );

    CREATE INDEX IX_Players_TeamId ON dbo.Players(TeamId);

    /*  At most one player per login account. This has to be a FILTERED unique
        index rather than a UNIQUE constraint: SQL Server treats NULLs as equal
        for uniqueness, so a plain UNIQUE(UserId) would allow only ONE
        login-less player in the whole table.

        Migration 002 repairs databases created before this was understood.  */
    CREATE UNIQUE INDEX UX_Players_UserId
        ON dbo.Players(UserId)
        WHERE UserId IS NOT NULL;
END
GO

/* -------------------------------------------------------------- Matches */
IF OBJECT_ID('dbo.Matches', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Matches (
        MatchId    INT IDENTITY(1,1) NOT NULL,
        HomeTeamId INT               NOT NULL,
        AwayTeamId INT               NOT NULL,
        MatchDate  DATETIME          NOT NULL,
        HomeScore  INT               NULL,
        AwayScore  INT               NULL,
        Status     NVARCHAR(20)      NOT NULL CONSTRAINT DF_Matches_Status DEFAULT ('Scheduled'),
        CONSTRAINT PK_Matches          PRIMARY KEY (MatchId),
        CONSTRAINT CK_Matches_Status   CHECK (Status IN ('Scheduled','Completed')),
        CONSTRAINT FK_Matches_HomeTeam FOREIGN KEY (HomeTeamId) REFERENCES dbo.Teams(TeamId),
        CONSTRAINT FK_Matches_AwayTeam FOREIGN KEY (AwayTeamId) REFERENCES dbo.Teams(TeamId)
    );

    CREATE INDEX IX_Matches_HomeTeamId ON dbo.Matches(HomeTeamId);
    CREATE INDEX IX_Matches_AwayTeamId ON dbo.Matches(AwayTeamId);
END
GO

/* ---------------------------------------------------------------- Goals */
IF OBJECT_ID('dbo.Goals', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Goals (
        GoalId   INT IDENTITY(1,1) NOT NULL,
        MatchId  INT               NOT NULL,
        PlayerId INT               NOT NULL,
        Minute   INT               NULL,
        CONSTRAINT PK_Goals         PRIMARY KEY (GoalId),
        CONSTRAINT FK_Goals_Matches FOREIGN KEY (MatchId)  REFERENCES dbo.Matches(MatchId),
        CONSTRAINT FK_Goals_Players FOREIGN KEY (PlayerId) REFERENCES dbo.Players(PlayerId)
    );

    CREATE INDEX IX_Goals_MatchId  ON dbo.Goals(MatchId);
    CREATE INDEX IX_Goals_PlayerId ON dbo.Goals(PlayerId);
END
GO
