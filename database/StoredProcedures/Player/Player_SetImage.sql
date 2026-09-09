/*  Points a player at a new photo, or clears it when @ImageUrl is NULL.

    Deliberately NOT folded into dbo.Player_Update: that procedure replaces every
    editable field, so a plain squad edit would wipe the photo of any caller who
    did not resend it. Images have their own endpoint and their own procedure.

    The UPDATE captures the outgoing value with OUTPUT rather than reading it
    first, so the caller learns which file it may now delete without a race
    against a second upload landing in between.

    Returns: one row
      RowsAffected      0 means no such player, which the caller turns into a 404
      PreviousUrl       the file the caller should delete, or NULL if there was none  */
CREATE OR ALTER PROCEDURE dbo.Player_SetImage
    @PlayerId INT,
    @ImageUrl NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Previous TABLE (ImageUrl NVARCHAR(255) NULL);

    UPDATE dbo.Players
    SET ImageUrl = @ImageUrl
    OUTPUT deleted.ImageUrl INTO @Previous (ImageUrl)
    WHERE PlayerId = @PlayerId;

    DECLARE @Rows INT = @@ROWCOUNT;

    SELECT @Rows AS RowsAffected,
           (SELECT TOP (1) ImageUrl FROM @Previous) AS PreviousUrl;
END
