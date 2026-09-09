/*  Removes one goal. Single statement, so no transaction is needed.

    No endpoint calls this yet - there is no DELETE on a goal. Defined so goal
    removal has a home.

    Returns: one row, RowsAffected - 0 means no such goal, which the caller
    turns into a 404.  */
CREATE OR ALTER PROCEDURE dbo.Goal_Delete
    @GoalId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DELETE FROM dbo.Goals WHERE GoalId = @GoalId;

    SELECT @@ROWCOUNT AS RowsAffected;
END
