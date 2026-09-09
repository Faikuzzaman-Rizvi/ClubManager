using System.Text.Json;

namespace ClubManager.Database;

/// <summary>
/// Turns the command line, the environment and appsettings.json into
/// <see cref="PublishOptions"/>. Hand-rolled rather than pulled from
/// Microsoft.Extensions.Configuration, so the tool keeps a single dependency.
/// </summary>
public static class CommandLine
{
    private const string ConnectionEnvironmentVariable = "CLUBMANAGER_CONNECTION";

    public static PublishOptions BuildOptions(string[] args)
    {
        var switches = Parse(args);

        return new PublishOptions
        {
            ConnectionString = ResolveConnectionString(switches),
            ScriptRoot = ResolveScriptRoot(switches),
            IncludeDemoData = switches.ContainsKey("demo-data")
        };
    }

    private static Dictionary<string, string?> Parse(string[] args)
    {
        var switches = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < args.Length; i++)
        {
            if (!args[i].StartsWith("--", StringComparison.Ordinal))
            {
                continue;
            }

            var name = args[i][2..];

            // A flag is a switch whose next token is another switch, or nothing.
            var hasValue = i + 1 < args.Length && !args[i + 1].StartsWith("--", StringComparison.Ordinal);

            switches[name] = hasValue ? args[++i] : null;
        }

        return switches;
    }

    /// <summary>
    /// Command line beats environment beats appsettings.json. The environment
    /// variable is what a deployment pipeline sets, so it must not need a file
    /// on the box to be edited.
    /// </summary>
    private static string ResolveConnectionString(Dictionary<string, string?> switches)
    {
        if (switches.TryGetValue("connection", out var fromCommandLine) && !string.IsNullOrWhiteSpace(fromCommandLine))
        {
            return fromCommandLine;
        }

        var fromEnvironment = Environment.GetEnvironmentVariable(ConnectionEnvironmentVariable);
        if (!string.IsNullOrWhiteSpace(fromEnvironment))
        {
            return fromEnvironment;
        }

        var fromFile = ReadConnectionStringFromAppSettings();
        if (!string.IsNullOrWhiteSpace(fromFile))
        {
            return fromFile;
        }

        throw new InvalidOperationException(
            "No connection string. Pass --connection, set " + ConnectionEnvironmentVariable +
            ", or fill in ConnectionStrings:DefaultConnection in appsettings.json.");
    }

    private static string? ReadConnectionStringFromAppSettings()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (!File.Exists(path))
        {
            return null;
        }

        using var document = JsonDocument.Parse(File.ReadAllText(path));

        return document.RootElement.TryGetProperty("ConnectionStrings", out var connectionStrings)
            && connectionStrings.TryGetProperty("DefaultConnection", out var defaultConnection)
                ? defaultConnection.GetString()
                : null;
    }

    /// <summary>
    /// Defaults to the scripts copied next to the tool by the build, which is
    /// what makes the published binary self-contained on a deployment box.
    /// </summary>
    private static string ResolveScriptRoot(Dictionary<string, string?> switches)
    {
        if (switches.TryGetValue("scripts", out var fromCommandLine) && !string.IsNullOrWhiteSpace(fromCommandLine))
        {
            return Path.GetFullPath(fromCommandLine);
        }

        var alongsideTool = Path.Combine(AppContext.BaseDirectory, "database");
        if (Directory.Exists(alongsideTool))
        {
            return alongsideTool;
        }

        throw new InvalidOperationException(
            $"No scripts found at '{alongsideTool}'. Build the project, or pass --scripts <path>.");
    }
}
