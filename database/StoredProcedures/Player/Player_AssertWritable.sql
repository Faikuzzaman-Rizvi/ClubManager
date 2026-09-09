/*  The integrity rules shared by Player_Create and Player_Update, kept in one
    place so the two write paths cannot drift apart. Raises; returns nothing.

    @PlayerId is the row being updated - it is excluded from the clash checks
    so an update does not collide with itself. Pass NULL when inserting.

    Called from inside the caller's transaction, so the UPDLOCK/HOLDLOCK hints
    hold until that transaction ends and two concurrent writers cannot both
    pass the same uniqueness check.

    Raises 50001 (no such team), 50011 (jersey taken), 50012 (login missing or
    not a Player login), 50013 (login already linked).

    Called by: dbo.Player_Create, dbo.Player_Update  */
CREATE OR ALTER PROCEDURE dbo.Player_AssertWritable
    @TeamId       INT,
    @JerseyNumber INT = NULL,
    @UserId       INT = NULL,
    @PlayerId     INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE TeamId = @TeamId)
        THROW 50001, 'That team does not exist.', 1;

    /* Jersey numbers are unique within a team; an unset number is always fine,
       so a squad may hold any number of players with no number yet. */
    IF @JerseyNumber IS NOT NULL
       AND EXISTS (SELECT 1 FROM dbo.Players WITH (UPDLOCK, HOLDLOCK)
                   WHERE TeamId = @TeamId
                     AND JerseyNumber = @JerseyNumber
                     AND (@PlayerId IS NULL OR PlayerId <> @PlayerId))
        THROW 50011, 'That jersey number is already taken on this team.', 1;

    IF @UserId IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = @UserId AND Role = N'Player')
            THROW 50012, 'A player can only be linked to an existing Player login.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Players WITH (UPDLOCK, HOLDLOCK)
                   WHERE UserId = @UserId
                     AND (@PlayerId IS NULL OR PlayerId <> @PlayerId))
            THROW 50013, 'That login is already linked to another player.', 1;
    END
END
