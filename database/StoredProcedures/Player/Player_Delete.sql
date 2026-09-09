/*  Deletes a player unless goals are recorded against them.

    Goals carries a foreign key to Players. Counting and deleting in one
    transaction replaces two round trips and reports the blocker instead of
    raising an FK error.

    Returns: one row
      Outcome    0 = no such player, 1 = deleted, 2 = blocked by goals
      GoalCount  goals recorded against them  */
CREATE OR ALTER PROCEDURE dbo.Player_Delete
    @PlayerId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Outcome   TINYINT = 0,
            @GoalCount INT     = 0;

    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM dbo.Players WITH (UPDLOCK, HOLDLOCK) WHERE PlayerId = @PlayerId)
    BEGIN
        SELECT @GoalCount = COUNT(1) FROM dbo.Goals WHERE PlayerId = @PlayerId;

        IF @GoalCount > 0
            SET @Outcome = 2;
        ELSE
        BEGIN
            DELETE FROM dbo.Players WHERE PlayerId = @PlayerId;
            SET @Outcome = 1;
        END
    END

    COMMIT TRANSACTION;

    SELECT @Outcome   AS Outcome,
           @GoalCount AS GoalCount;
END
