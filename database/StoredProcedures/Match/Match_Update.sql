/*  Replaces a fixture, and is also the result-entry path: send both scores
    with @Status = 'Completed'.

    Returns: one row, RowsAffected - 0 means no such match, which the caller
    turns into a 404.  */
CREATE OR ALTER PROCEDURE dbo.Match_Update
    @MatchId    INT,
    @HomeTeamId INT,
    @AwayTeamId INT,
    @MatchDate  DATETIME,
    @Status     NVARCHAR(20),
    @HomeScore  INT = NULL,
    @AwayScore  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Rows INT = 0;

    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.Matches WITH (UPDLOCK, HOLDLOCK) WHERE MatchId = @MatchId)
    BEGIN
        COMMIT TRANSACTION;
        SELECT 0 AS RowsAffected;
        RETURN;
    END

    EXEC dbo.Match_AssertWritable
        @HomeTeamId = @HomeTeamId,
        @AwayTeamId = @AwayTeamId,
        @Status     = @Status,
        @HomeScore  = @HomeScore,
        @AwayScore  = @AwayScore;

    UPDATE dbo.Matches
    SET HomeTeamId = @HomeTeamId,
        AwayTeamId = @AwayTeamId,
        MatchDate  = @MatchDate,
        HomeScore  = @HomeScore,
        AwayScore  = @AwayScore,
        Status     = @Status
    WHERE MatchId = @MatchId;

    SET @Rows = @@ROWCOUNT;

    COMMIT TRANSACTION;

    SELECT @Rows AS RowsAffected;
END
