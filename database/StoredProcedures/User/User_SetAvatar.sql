/*  Points an account at a new avatar, or clears it when @AvatarUrl is NULL.

    Clearing does not leave a Player account faceless: dbo.vw_UserProfile falls
    back to the linked player's photo, so removing an avatar reverts to that
    rather than to initials.

    Returns: one row
      RowsAffected       0 means no such account, which the caller turns into a 404
      PreviousUrl        the file the caller should delete, or NULL if there was none  */
CREATE OR ALTER PROCEDURE dbo.User_SetAvatar
    @UserId    INT,
    @AvatarUrl NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Previous TABLE (AvatarUrl NVARCHAR(255) NULL);

    UPDATE dbo.Users
    SET AvatarUrl = @AvatarUrl
    OUTPUT deleted.AvatarUrl INTO @Previous (AvatarUrl)
    WHERE UserId = @UserId;

    DECLARE @Rows INT = @@ROWCOUNT;

    SELECT @Rows AS RowsAffected,
           (SELECT TOP (1) AvatarUrl FROM @Previous) AS PreviousUrl;
END
