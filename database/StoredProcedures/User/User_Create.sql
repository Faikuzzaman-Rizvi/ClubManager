/*  Creates a login account.

    Raises 50041 when the role / team combination is wrong, 50001 when the
    team does not exist, 50040 when the username is taken. See
    database/README.md for the error-number contract.

    Returns: one row, UserId  */
CREATE OR ALTER PROCEDURE dbo.User_Create
    @Username     NVARCHAR(50),
    @PasswordHash NVARCHAR(255),
    @Role         NVARCHAR(20),
    @TeamId       INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Role NOT IN (N'Admin', N'Coach', N'Player')
        THROW 50041, 'Role must be Admin, Coach or Player.', 1;

    /* TeamId is only meaningful for a Coach: it is the team that coach is
       scoped to. Admin and Player accounts must leave it unset - a Player's
       team comes from their player record, not from their login. */
    IF @Role = N'Coach' AND @TeamId IS NULL
        THROW 50041, 'A Coach account must be assigned a team.', 1;

    IF @Role <> N'Coach' AND @TeamId IS NOT NULL
        THROW 50041, 'Only a Coach account can be assigned a team.', 1;

    IF @TeamId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE TeamId = @TeamId)
        THROW 50001, 'That team does not exist.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Username = @Username)
        THROW 50040, 'That username is already taken.', 1;

    BEGIN TRY
        INSERT INTO dbo.Users (Username, PasswordHash, Role, TeamId)
        VALUES (@Username, @PasswordHash, @Role, @TeamId);
    END TRY
    BEGIN CATCH
        /* Two registrations racing on the same username land here instead of
           on the EXISTS check above. Report it the same way either way. */
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50040, 'That username is already taken.', 1;

        THROW;
    END CATCH

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS UserId;
END
