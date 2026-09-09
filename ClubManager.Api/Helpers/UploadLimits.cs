namespace ClubManager.Api.Helpers;

/// <summary>
/// The hard ceiling on an upload request body, enforced by the pipeline before
/// a single byte reaches a controller.
/// </summary>
/// <remarks>
/// This is deliberately larger than <see cref="ImageStorageOptions.MaxBytes"/>.
/// The configured image limit is the one users are told about, and refusing a
/// slightly-too-big file there produces a clear 400 explaining the size cap.
/// This constant only exists to stop something absurd from being buffered at
/// all, and has to leave room for multipart framing on top of the file itself.
///
/// It must be a compile-time constant because <c>[RequestSizeLimit]</c> is an
/// attribute, so it cannot come from configuration. Raising the configured
/// image limit above this would make the pipeline reject files the service
/// would have accepted - keep the two in step.
/// </remarks>
public static class UploadLimits
{
    public const long MaxRequestBytes = 12 * 1024 * 1024;
}
