using System.Text.RegularExpressions;

namespace ClubManager.Database;

/// <summary>
/// Splits a script on its GO separators.
/// </summary>
/// <remarks>
/// GO is not T-SQL - it is a batch terminator that only client tools understand,
/// so <c>SqlCommand</c> rejects it. Anything that runs .sql files has to do this
/// split itself.
///
/// The separator is a line whose only content is GO, optionally followed by a
/// repeat count and a trailing comment. Matching on whole lines is what keeps
/// identifiers such as <c>[GO]</c> or a column named <c>Go</c> from being treated
/// as terminators. A bare GO inside a block comment or a string literal would
/// still split wrongly; no script here has one, and neither does sqlcmd handle
/// that case.
/// </remarks>
public static partial class SqlBatch
{
    [GeneratedRegex(
        @"^[\t ]*GO[\t ]*(?:\d+)?[\t ]*(?:--.*)?$",
        RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex BatchSeparator();

    /// <summary>
    /// The executable batches in <paramref name="script"/>, in order, with blank
    /// ones dropped - a trailing GO leaves an empty tail that SQL Server would
    /// reject.
    /// </summary>
    public static IReadOnlyList<string> Split(string script)
    {
        return BatchSeparator()
            .Split(script)
            .Where(batch => !string.IsNullOrWhiteSpace(batch))
            .ToList();
    }
}
