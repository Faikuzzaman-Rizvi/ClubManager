/*  Records a goal.

    A goal only makes sense for someone on one of the two sides, so the check
    and the insert share one transaction: HOLDLOCK keeps the fixture from being
    re-pointed at other teams between the two statements.

    Raises 50031 (minute out of range), 50020 (no such match), 50010 (no such
    player), 50030 (scorer plays for neither side).

    Returns: one row, GoalId  */
CREATE OR ALTER PROCEDURE dbo.Goal_Create
    @MatchId  INT,
    @PlayerId INT,
    @Minute   INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /* Nine minutes of stoppage on top of extra time is the practical ceiling;
       anything outside 0-130 is a typo, not a late winner. */
    IF @Minute IS NOT NULL AND (@Minute < 0 OR @Minute > 130)
        THROW 50031, 'The minute must be between 0 and 130.', 1;

    DECLARE @HomeTeamId   INT,
            @AwayTeamId   INT,
            @ScorerTeamId INT,
            @NewGoalId    INT;

    BEGIN TRANSACTION;

    SELECT @HomeTeamId = HomeTeamId,
           @AwayTeamId = AwayTeamId
    FROM dbo.Matches WITH (UPDLOCK, HOLDLOCK)
    WHERE MatchId = @MatchId;

    IF @HomeTeamId IS NULL
        THROW 50020, 'That match does not exist.', 1;

    SELECT @ScorerTeamId = TeamId
    FROM dbo.Players
    WHERE PlayerId = @PlayerId;

    IF @ScorerTeamId IS NULL
        THROW 50010, 'That player does not exist.', 1;

    IF @ScorerTeamId NOT IN (@HomeTeamId, @AwayTeamId)
        THROW 50030, 'That player does not play for either team in this match.', 1;

    INSERT INTO dbo.Goals (MatchId, PlayerId, Minute)
    VALUES (@MatchId, @PlayerId, @Minute);

    SET @NewGoalId = CAST(SCOPE_IDENTITY() AS INT);

    COMMIT TRANSACTION;

    SELECT @NewGoalId AS GoalId;
END
