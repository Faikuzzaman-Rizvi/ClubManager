using System.Security.Cryptography;
using System.Text;

namespace ClubManager.Database;

/// <summary>One .sql file on disk, with the identity the publisher records it under.</summary>
public sealed class ScriptFile
{
    private ScriptFile(string name, string fullPath, string content, string checksum)
    {
        Name = name;
        FullPath = fullPath;
        Content = content;
        Checksum = checksum;
    }

    /// <summary>
    /// Path relative to the script root, with forward slashes - stable across
    /// operating systems, so a migration applied on Windows is recognised as the
    /// same migration on Linux.
    /// </summary>
    public string Name { get; }

    public string FullPath { get; }
    public string Content { get; }

    /// <summary>SHA-256 of the content, used to detect an edited migration.</summary>
    public string Checksum { get; }

    public static ScriptFile Load(string rootDirectory, string fullPath)
    {
        var content = File.ReadAllText(fullPath);

        var name = Path.GetRelativePath(rootDirectory, fullPath).Replace('\\', '/');

        return new ScriptFile(name, fullPath, content, ComputeChecksum(content));
    }

    /// <summary>
    /// Loads every .sql file under <paramref name="directory"/>, ordered by name.
    /// Ordinal order on the relative path is what makes the 001_/002_/003_ prefix
    /// the running order, and it does not shift with the machine's culture.
    /// </summary>
    public static IReadOnlyList<ScriptFile> LoadAll(string rootDirectory, string directory)
    {
        if (!Directory.Exists(directory))
        {
            return Array.Empty<ScriptFile>();
        }

        return Directory
            .EnumerateFiles(directory, "*.sql", SearchOption.AllDirectories)
            .Select(path => Load(rootDirectory, path))
            .OrderBy(script => script.Name, StringComparer.Ordinal)
            .ToList();
    }

    /// <summary>
    /// Hashes the content with line endings normalised, so the same file checked
    /// out as CRLF on Windows and LF on Linux hashes identically. Without this a
    /// clone with different git settings would look like an edited migration.
    /// </summary>
    private static string ComputeChecksum(string content)
    {
        var normalised = content.Replace("\r\n", "\n").Replace("\r", "\n");
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(normalised));

        return Convert.ToHexString(hash);
    }
}
