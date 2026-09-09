/*  Replaces a team's editable columns.

    Returns: one row, RowsAffected - 0 means no such team, which the caller
    turns into a 404.  */
CREATE OR ALTER PROCEDURE dbo.Team_Update
    @TeamId   INT,
    @TeamName NVARCHAR(100),
    @City     NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    UPDATE dbo.Teams
    SET TeamName = @TeamName,
        City     = @City
    WHERE TeamId = @TeamId;

    SELECT @@ROWCOUNT AS RowsAffected;
END
