/*  Schedules a fixture.

    Returns: one row, MatchId  */
CREATE OR ALTER PROCEDURE dbo.Match_Create
    @HomeTeamId INT,
    @AwayTeamId INT,
    @MatchDate  DATETIME,
    @Status     NVARCHAR(20) = N'Scheduled',
    @HomeScore  INT          = NULL,
    @AwayScore  INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    EXEC dbo.Match_AssertWritable
        @HomeTeamId = @HomeTeamId,
        @AwayTeamId = @AwayTeamId,
        @Status     = @Status,
        @HomeScore  = @HomeScore,
        @AwayScore  = @AwayScore;

    INSERT INTO dbo.Matches (HomeTeamId, AwayTeamId, MatchDate, HomeScore, AwayScore, Status)
    VALUES (@HomeTeamId, @AwayTeamId, @MatchDate, @HomeScore, @AwayScore, @Status);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS MatchId;
END
