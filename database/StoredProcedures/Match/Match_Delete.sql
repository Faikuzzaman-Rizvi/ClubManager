/*  Deletes a fixture together with its goals.

    Removing a fixture has to take its goals with it, or the foreign key from
    Goals blocks the delete. Both statements run in one transaction, so a
    fixture is never left with its goals half removed.

    No endpoint calls this yet - DELETE /api/matches/{id} does not exist. The
    procedure is defined so the delete path lives in one place if it is ever
    exposed.

    Returns: one row
      Outcome    0 = no such match, 1 = deleted
      GoalCount  goals removed along with it  */
CREATE OR ALTER PROCEDURE dbo.Match_Delete
    @MatchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Outcome   TINYINT = 0,
            @GoalCount INT     = 0;

    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM dbo.Matches WITH (UPDLOCK, HOLDLOCK) WHERE MatchId = @MatchId)
    BEGIN
        DELETE FROM dbo.Goals WHERE MatchId = @MatchId;
        SET @GoalCount = @@ROWCOUNT;

        DELETE FROM dbo.Matches WHERE MatchId = @MatchId;
        SET @Outcome = 1;
    END

    COMMIT TRANSACTION;

    SELECT @Outcome   AS Outcome,
           @GoalCount AS GoalCount;
END
