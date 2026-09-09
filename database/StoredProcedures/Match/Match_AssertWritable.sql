/*  The integrity rules shared by Match_Create and Match_Update, kept in one
    place so the two write paths cannot drift apart. Raises; returns nothing.

    Raises 50021 (a team playing itself), 50001 (no such team), 50022 (status
    and score disagree).

    Called by: dbo.Match_Create, dbo.Match_Update  */
CREATE OR ALTER PROCEDURE dbo.Match_AssertWritable
    @HomeTeamId INT,
    @AwayTeamId INT,
    @Status     NVARCHAR(20),
    @HomeScore  INT = NULL,
    @AwayScore  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @HomeTeamId = @AwayTeamId
        THROW 50021, 'A team cannot play itself.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE TeamId = @HomeTeamId)
        THROW 50001, 'The home team does not exist.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE TeamId = @AwayTeamId)
        THROW 50001, 'The away team does not exist.', 1;

    IF @Status NOT IN (N'Scheduled', N'Completed')
        THROW 50022, 'Status must be Scheduled or Completed.', 1;

    /* Score and status have to agree: a completed match has a result, a
       scheduled one does not. Without this the standings would count a
       Completed row with no score as played-and-lost. */
    IF @Status = N'Completed' AND (@HomeScore IS NULL OR @AwayScore IS NULL)
        THROW 50022, 'A completed match needs both scores.', 1;

    IF @Status = N'Scheduled' AND (@HomeScore IS NOT NULL OR @AwayScore IS NOT NULL)
        THROW 50022, 'A scheduled match cannot carry a score.', 1;
END
