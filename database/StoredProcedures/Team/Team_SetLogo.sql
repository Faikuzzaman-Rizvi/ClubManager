/*  Points a team at a new crest, or clears it when @LogoUrl is NULL.

    Kept out of dbo.Team_Update for the same reason as Player_SetImage: that
    procedure replaces every editable field, so a rename would otherwise drop
    the crest of any caller who did not resend it.

    Returns: one row
      RowsAffected     0 means no such team, which the caller turns into a 404
      PreviousUrl      the file the caller should delete, or NULL if there was none  */
CREATE OR ALTER PROCEDURE dbo.Team_SetLogo
    @TeamId  INT,
    @LogoUrl NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Previous TABLE (LogoUrl NVARCHAR(255) NULL);

    UPDATE dbo.Teams
    SET LogoUrl = @LogoUrl
    OUTPUT deleted.LogoUrl INTO @Previous (LogoUrl)
    WHERE TeamId = @TeamId;

    DECLARE @Rows INT = @@ROWCOUNT;

    SELECT @Rows AS RowsAffected,
           (SELECT TOP (1) LogoUrl FROM @Previous) AS PreviousUrl;
END
