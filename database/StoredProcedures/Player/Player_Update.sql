/*  Replaces a player's editable columns.

    Returns: one row, RowsAffected - 0 means no such player, which the caller
    turns into a 404.  */
CREATE OR ALTER PROCEDURE dbo.Player_Update
    @PlayerId     INT,
    @TeamId       INT,
    @Name         NVARCHAR(100),
    @Position     NVARCHAR(30) = NULL,
    @JerseyNumber INT          = NULL,
    @Age          INT          = NULL,
    @UserId       INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Rows INT = 0;

    BEGIN TRANSACTION;

    /* Checked before the integrity rules, so a missing player reports as
       "not found" rather than as whatever clash the new values happen to hit. */
    IF NOT EXISTS (SELECT 1 FROM dbo.Players WITH (UPDLOCK, HOLDLOCK) WHERE PlayerId = @PlayerId)
    BEGIN
        COMMIT TRANSACTION;
        SELECT 0 AS RowsAffected;
        RETURN;
    END

    EXEC dbo.Player_AssertWritable
        @TeamId       = @TeamId,
        @JerseyNumber = @JerseyNumber,
        @UserId       = @UserId,
        @PlayerId     = @PlayerId;

    UPDATE dbo.Players
    SET UserId       = @UserId,
        TeamId       = @TeamId,
        Name         = @Name,
        Position     = @Position,
        JerseyNumber = @JerseyNumber,
        Age          = @Age
    WHERE PlayerId = @PlayerId;

    SET @Rows = @@ROWCOUNT;

    COMMIT TRANSACTION;

    SELECT @Rows AS RowsAffected;
END
