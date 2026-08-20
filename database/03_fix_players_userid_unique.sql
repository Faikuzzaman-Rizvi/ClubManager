/* =====================================================================
   Migration - replace UQ_Players_UserId with a filtered unique index.

   The original constraint was UNIQUE(UserId) on a nullable column. SQL Server
   treats NULLs as equal for uniqueness, so that constraint allowed only ONE
   player row with UserId = NULL across the whole table - i.e. only one
   login-less player club-wide. A filtered index gives the intended rule:
   at most one player per login account, unlimited players with no account.

   Only needed for databases created before this fix; 01_schema.sql now builds
   the filtered index directly. Safe to re-run.
   ===================================================================== */

USE ClubManagerDb;
GO

/* Required for the filtered unique index below; sqlcmd leaves this OFF by default. */
SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints
           WHERE name = 'UQ_Players_UserId'
             AND parent_object_id = OBJECT_ID('dbo.Players'))
BEGIN
    ALTER TABLE dbo.Players DROP CONSTRAINT UQ_Players_UserId;
    PRINT 'Dropped constraint UQ_Players_UserId.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_Players_UserId'
                 AND object_id = OBJECT_ID('dbo.Players'))
BEGIN
    CREATE UNIQUE INDEX UX_Players_UserId
        ON dbo.Players(UserId)
        WHERE UserId IS NOT NULL;

    PRINT 'Created filtered unique index UX_Players_UserId.';
END
ELSE
BEGIN
    PRINT 'UX_Players_UserId already exists - nothing to do.';
END
GO
