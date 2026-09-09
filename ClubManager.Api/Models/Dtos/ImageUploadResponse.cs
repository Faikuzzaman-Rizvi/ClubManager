namespace ClubManager.Api.Models.Dtos;

/// <summary>
/// What every image upload and removal returns. The client stores the URL and
/// swaps it into whatever it is already showing, so no list needs reloading
/// after an image changes.
/// </summary>
public class ImageUploadResponse
{
    /// <summary>
    /// The stored image, or null after a removal - and, for a Player account
    /// whose own avatar was just cleared, the linked player photo it fell back to.
    /// </summary>
    public string? ImageUrl { get; set; }
}
