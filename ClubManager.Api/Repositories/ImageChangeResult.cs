namespace ClubManager.Api.Repositories;

/// <summary>
/// What one of the *_SetImage / _SetLogo / _SetAvatar procedures did.
///
/// <para>
/// <see cref="PreviousUrl"/> is captured by the same UPDATE that wrote the new
/// value, so the caller can delete the file it replaced without racing a second
/// upload that landed in between.
/// </para>
/// </summary>
public class ImageChangeResult
{
    /// <summary>0 when no such row, which the caller turns into a 404.</summary>
    public int RowsAffected { get; set; }

    /// <summary>The image that was there before, or null if there was none.</summary>
    public string? PreviousUrl { get; set; }

    public bool Found => RowsAffected > 0;
}
