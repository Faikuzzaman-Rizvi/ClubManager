/*  Creates a player.

    Calls dbo.Player_AssertWritable inside the transaction, so a rule failure
    raises and XACT_ABORT rolls the insert back with it.

    Returns: one row, PlayerId  */
CREATE OR ALTER PROCEDURE dbo.Player_Create
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

    DECLARE @NewPlayerId INT;

    BEGIN TRANSACTION;

    EXEC dbo.Player_AssertWritable
        @TeamId       = @TeamId,
        @JerseyNumber = @JerseyNumber,
        @UserId       = @UserId,
        @PlayerId     = NULL;

    INSERT INTO dbo.Players (UserId, TeamId, Name, Position, JerseyNumber, Age)
    VALUES (@UserId, @TeamId, @Name, @Position, @JerseyNumber, @Age);

    SET @NewPlayerId = CAST(SCOPE_IDENTITY() AS INT);

    COMMIT TRANSACTION;

    SELECT @NewPlayerId AS PlayerId;
END
