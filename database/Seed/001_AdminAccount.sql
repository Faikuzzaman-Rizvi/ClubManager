/* =====================================================================
   Seed - the single bootstrap Admin account.

   Seed scripts run on every publish and must therefore be idempotent: this
   one inserts only when the account is missing, and never touches an
   existing row, so a changed password survives a re-publish.

   Username : admin
   Password : Admin@123
   The hash below is BCrypt (work factor 12) of that password.
   >>> Change this password after the first login on any real deployment.

   Admin accounts exist only through this script - POST /api/auth/register
   mints Coach and Player logins only.
   ===================================================================== */

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'admin')
BEGIN
    INSERT INTO dbo.Users (Username, PasswordHash, Role, TeamId)
    VALUES (N'admin',
            N'$2a$12$4DqmYsvV.ykCTsgYJRKSfebF/S3SD1VIxv9g0cQ9CwOd2PXICIKBu',
            N'Admin',
            NULL);

    PRINT 'Seeded Admin user: admin / Admin@123';
END
GO
