/*  Creates a team.

    Returns: one row, TeamId  */
CREATE OR ALTER PROCEDURE dbo.Team_Create
    @TeamName NVARCHAR(100),
    @City     NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    INSERT INTO dbo.Teams (TeamName, City)
    VALUES (@TeamName, @City);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS TeamId;
END
