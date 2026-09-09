/*  Deletes a team if nothing points at it.

    Teams is the parent of Players, Users (coaches) and Matches. Checking the
    references and deleting in one transaction replaces three round trips from
    the service and closes the window where a row could be added between the
    check and the delete.

    Returns: one row
      Outcome     0 = no such team, 1 = deleted, 2 = blocked by references
      PlayerCount / UserCount / MatchCount  what is in the way when blocked  */
CREATE OR ALTER PROCEDURE dbo.Team_Delete
    @TeamId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Outcome     TINYINT = 0,
            @PlayerCount INT     = 0,
            @UserCount   INT     = 0,
            @MatchCount  INT     = 0;

    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM dbo.Teams WITH (UPDLOCK, HOLDLOCK) WHERE TeamId = @TeamId)
    BEGIN
        SELECT @PlayerCount = COUNT(1) FROM dbo.Players WHERE TeamId = @TeamId;
        SELECT @UserCount   = COUNT(1) FROM dbo.Users   WHERE TeamId = @TeamId;
        SELECT @MatchCount  = COUNT(1) FROM dbo.Matches WHERE HomeTeamId = @TeamId OR AwayTeamId = @TeamId;

        IF (@PlayerCount + @UserCount + @MatchCount) > 0
            SET @Outcome = 2;
        ELSE
        BEGIN
            /* If a child row still sneaks in under a concurrent insert, the
               foreign keys reject this and XACT_ABORT rolls the batch back -
               the team is never orphaned either way. */
            DELETE FROM dbo.Teams WHERE TeamId = @TeamId;
            SET @Outcome = 1;
        END
    END

    COMMIT TRANSACTION;

    SELECT @Outcome     AS Outcome,
           @PlayerCount AS PlayerCount,
           @UserCount   AS UserCount,
           @MatchCount  AS MatchCount;
END
