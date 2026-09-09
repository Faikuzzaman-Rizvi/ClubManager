/* =====================================================================
   004 - Image columns for players, teams and user accounts.

   Only the URL lives in SQL Server. The file itself is written to disk under
   the API's upload root and served as static content, so the database stays
   small and the images stay cacheable by the browser - see
   ClubManager.Api/Helpers/ImageStorage.cs.

   The stored value is a site-relative path such as
   '/uploads/players/9f2c....webp'. NVARCHAR(255) is comfortably more than a
   GUID-based name needs, and leaves room for a future CDN prefix.

   All three columns are NULLABLE with no default: every existing row keeps
   working, and "no image" stays a first-class state rather than a magic
   placeholder path.
   ===================================================================== */

IF COL_LENGTH('dbo.Players', 'ImageUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Players ADD ImageUrl NVARCHAR(255) NULL;
    PRINT 'Added Players.ImageUrl.';
END
GO

IF COL_LENGTH('dbo.Teams', 'LogoUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Teams ADD LogoUrl NVARCHAR(255) NULL;
    PRINT 'Added Teams.LogoUrl.';
END
GO

IF COL_LENGTH('dbo.Users', 'AvatarUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD AvatarUrl NVARCHAR(255) NULL;
    PRINT 'Added Users.AvatarUrl.';
END
GO

/* No index on any of them. Nothing filters, joins or sorts on an image URL -
   every read already has the row in hand and just projects the column. */
