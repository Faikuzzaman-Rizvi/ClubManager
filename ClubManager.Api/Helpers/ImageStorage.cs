using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace ClubManager.Api.Helpers;

/// <summary>What an image is for. Decides the folder and the target size.</summary>
public enum ImageKind
{
    PlayerPhoto,
    TeamLogo,
    UserAvatar
}

public interface IImageStorage
{
    /// <summary>
    /// Validates, re-encodes and stores an upload. Returns the site-relative URL
    /// to persist, or a message describing why the file was refused.
    /// </summary>
    Task<ImageSaveResult> SaveAsync(IFormFile file, ImageKind kind, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes a file previously returned by <see cref="SaveAsync"/>. Silently
    /// does nothing for null, for a path outside the upload root, or for a file
    /// that is already gone - all three are normal, not errors worth failing a
    /// request over.
    /// </summary>
    void Delete(string? relativeUrl);
}

public sealed record ImageSaveResult(bool Succeeded, string? RelativeUrl, string? Error)
{
    public static ImageSaveResult Ok(string relativeUrl) => new(true, relativeUrl, null);
    public static ImageSaveResult Fail(string error) => new(false, null, error);
}

/// <summary>
/// Stores uploaded images on disk and hands back the URL to keep in SQL Server.
///
/// <para>
/// Everything is re-encoded to WebP through ImageSharp rather than copied
/// through. That is the security boundary as much as the optimisation: whatever
/// arrives has to survive being decoded as an image and written back out, so a
/// script, an executable or a polyglot file cannot reach the disk intact. It
/// also means the stored extension is always one this server chose.
/// </para>
/// <para>
/// The uploaded filename is never used, not even sanitised. Names are a fresh
/// GUID, which rules out path traversal, overwriting someone else's file, and
/// every reserved-name and unicode-normalisation trick in one go.
/// </para>
/// </summary>
public sealed class ImageStorage : IImageStorage
{
    /// <summary>
    /// Guards against a decompression bomb: a small file can declare enormous
    /// dimensions, and decoding it is what costs the memory. Checked from the
    /// header before any pixel is decoded.
    /// </summary>
    private const int MaxSourceDimension = 12_000;

    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    private static readonly string[] AllowedContentTypes =
        ["image/jpeg", "image/png", "image/webp"];

    private readonly ImageStorageOptions _options;
    private readonly ILogger<ImageStorage> _logger;

    public ImageStorage(IOptions<ImageStorageOptions> options, ILogger<ImageStorage> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ImageSaveResult> SaveAsync(
        IFormFile file, ImageKind kind, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return ImageSaveResult.Fail("No file was uploaded.");
        }

        if (file.Length > _options.MaxBytes)
        {
            var limitMb = _options.MaxBytes / (1024d * 1024d);
            return ImageSaveResult.Fail($"The image must be {limitMb:0.#} MB or smaller.");
        }

        // Three independent checks, because each is easy to fake on its own: the
        // extension and the content type both come from the client, and only the
        // signature comes from the bytes.
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) ||
            !AllowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
        {
            return UnsupportedType();
        }

        if (!AllowedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return UnsupportedType();
        }

        await using var upload = file.OpenReadStream();

        if (!await HasSupportedSignatureAsync(upload, cancellationToken))
        {
            return UnsupportedType();
        }

        upload.Position = 0;

        try
        {
            var info = await Image.IdentifyAsync(upload, cancellationToken);

            if (info is null)
            {
                return UnsupportedType();
            }

            if (info.Width > MaxSourceDimension || info.Height > MaxSourceDimension)
            {
                return ImageSaveResult.Fail(
                    $"The image is too large to process ({info.Width}x{info.Height} pixels).");
            }

            upload.Position = 0;

            using var image = await Image.LoadAsync(upload, cancellationToken);

            // Fit inside the box, keep the aspect ratio, and never scale a small
            // image up - Max does all three. A 4000px phone photo becomes a
            // sensibly sized avatar; a 64px crest is left alone.
            var box = TargetSize(kind);
            image.Mutate(context => context.Resize(new ResizeOptions
            {
                Size = new Size(box, box),
                Mode = ResizeMode.Max
            }));

            // GPS coordinates and camera serial numbers have no business being
            // served to every visitor.
            image.Metadata.ExifProfile = null;
            image.Metadata.IptcProfile = null;
            image.Metadata.XmpProfile = null;

            var folder = FolderFor(kind);
            var fileName = $"{Guid.NewGuid():N}.webp";
            var directory = Path.Combine(_options.RootPath, folder);

            Directory.CreateDirectory(directory);

            var encoder = new WebpEncoder { Quality = _options.Quality };
            await image.SaveAsync(Path.Combine(directory, fileName), encoder, cancellationToken);

            return ImageSaveResult.Ok($"{_options.RequestPath}/{folder}/{fileName}");
        }
        catch (UnknownImageFormatException)
        {
            // The bytes passed the signature check but no decoder accepted them.
            return UnsupportedType();
        }
        catch (InvalidImageContentException)
        {
            return ImageSaveResult.Fail("That image file appears to be corrupt.");
        }
    }

    public void Delete(string? relativeUrl)
    {
        var path = ResolveExistingPath(relativeUrl);
        if (path is null)
        {
            return;
        }

        try
        {
            File.Delete(path);
        }
        catch (IOException exception)
        {
            // A leftover file is untidy, not a failed request - the database
            // already points at the new image.
            _logger.LogWarning(exception, "Could not delete the replaced image {Path}.", path);
        }
        catch (UnauthorizedAccessException exception)
        {
            _logger.LogWarning(exception, "Not permitted to delete the replaced image {Path}.", path);
        }
    }

    /// <summary>
    /// Maps a stored URL back to a file inside the upload root, or null when it
    /// does not name one. The full-path comparison is what stops a value like
    /// "/uploads/../../appsettings.json" from reaching Delete, however it got
    /// into the column.
    /// </summary>
    private string? ResolveExistingPath(string? relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl))
        {
            return null;
        }

        var prefix = _options.RequestPath + "/";
        if (!relativeUrl.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        var root = Path.GetFullPath(_options.RootPath);
        var candidate = Path.GetFullPath(Path.Combine(root, relativeUrl[prefix.Length..]));

        if (!candidate.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            _logger.LogWarning("Refused to delete {Url}, which resolves outside the upload root.", relativeUrl);
            return null;
        }

        return File.Exists(candidate) ? candidate : null;
    }

    /// <summary>
    /// Reads the leading bytes and checks them against the formats we accept.
    /// The client controls the extension and the content type; it does not
    /// control these.
    /// </summary>
    private static async Task<bool> HasSupportedSignatureAsync(Stream stream, CancellationToken cancellationToken)
    {
        var header = new byte[12];
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);

        // The spans below cannot live in an async method, so the comparison is
        // its own synchronous step.
        return read >= header.Length && IsSupportedSignature(header);
    }

    private static bool IsSupportedSignature(ReadOnlySpan<byte> header)
    {
        // JPEG: FF D8 FF
        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return true;
        }

        // PNG: 89 "PNG" CR LF 1A LF
        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (header[..8].SequenceEqual(png))
        {
            return true;
        }

        // WebP: "RIFF" ....(size).... "WEBP"
        return header[..4].SequenceEqual("RIFF"u8)
            && header.Slice(8, 4).SequenceEqual("WEBP"u8);
    }

    private static ImageSaveResult UnsupportedType() =>
        ImageSaveResult.Fail("Only JPG, PNG and WebP images are accepted.");

    private static string FolderFor(ImageKind kind) => kind switch
    {
        ImageKind.PlayerPhoto => "players",
        ImageKind.TeamLogo => "teams",
        _ => "users"
    };

    /// <summary>
    /// The longest edge the stored image may have. Squad photos are shown at up
    /// to a few hundred pixels and avatars far less, so anything bigger is
    /// bandwidth nobody sees.
    /// </summary>
    private int TargetSize(ImageKind kind) => kind switch
    {
        ImageKind.PlayerPhoto => _options.PlayerPhotoSize,
        ImageKind.TeamLogo => _options.TeamLogoSize,
        _ => _options.UserAvatarSize
    };
}

public sealed class ImageStorageOptions
{
    public const string SectionName = "Uploads";

    /// <summary>Folder the files are written to. Relative paths resolve from the content root.</summary>
    public string RootPath { get; set; } = "wwwroot/uploads";

    /// <summary>URL prefix the files are served under. Must match the static-file mapping.</summary>
    public string RequestPath { get; set; } = "/uploads";

    /// <summary>Rejected above this, before anything is decoded. 5 MB by default.</summary>
    public long MaxBytes { get; set; } = 5 * 1024 * 1024;

    public int PlayerPhotoSize { get; set; } = 512;
    public int TeamLogoSize { get; set; } = 512;
    public int UserAvatarSize { get; set; } = 256;

    /// <summary>WebP quality. 80 is visually clean at a fraction of the original size.</summary>
    public int Quality { get; set; } = 80;
}
