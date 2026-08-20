/* =====================================================================
   ClubManager - seed the single bootstrap Admin account.
   Run after 01_schema.sql. Safe to re-run (inserts only if missing).

   Username : admin
   Password : Admin@123
   The hash below is BCrypt (work factor 12) of that password.
   >>> Change this password after the first login on any real deployment.
   ===================================================================== */

USE ClubManagerDb;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'admin')
BEGIN
    INSERT INTO dbo.Users (Username, PasswordHash, Role, TeamId)
    VALUES (N'admin',
            N'$2a$12$4DqmYsvV.ykCTsgYJRKSfebF/S3SD1VIxv9g0cQ9CwOd2PXICIKBu',
            N'Admin',
            NULL);

    PRINT 'Seeded Admin user: admin / Admin@123';
END
ELSE
BEGIN
    PRINT 'Admin user already exists - nothing to do.';
END
GO
