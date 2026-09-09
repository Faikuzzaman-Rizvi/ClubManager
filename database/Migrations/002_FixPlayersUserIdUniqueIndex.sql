/* =====================================================================
   002 - Replace UQ_Players_UserId with a filtered unique index.

   The original constraint was UNIQUE(UserId) on a nullable column. SQL Server
   treats NULLs as equal for uniqueness, so that constraint allowed only ONE
   player row with UserId = NULL across the whole table - i.e. only one
   login-less player club-wide. A filtered index gives the intended rule:
   at most one player per login account, unlimited players with no account.

   Only databases created before this fix have anything to change; migration
   001 now builds the filtered index directly, so on a fresh database this
   runs as a no-op and is simply recorded as applied.
   ===================================================================== */

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
GO
