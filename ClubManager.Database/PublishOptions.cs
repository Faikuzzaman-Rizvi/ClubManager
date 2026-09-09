namespace ClubManager.Database;

public sealed class PublishOptions
{
    public required string ConnectionString { get; init; }

    /// <summary>Folder holding Migrations/, Views/, StoredProcedures/, Seed/ and DemoData/.</summary>
    public required string ScriptRoot { get; init; }

    /// <summary>Opt-in only: the demo data script wipes and reseeds every table.</summary>
    public bool IncludeDemoData { get; init; }

    /// <summary>Generous, because a first publish on a cold server can be slow.</summary>
    public int CommandTimeoutSeconds { get; init; } = 120;
}

/// <summary>What a publish did, for the summary printed at the end.</summary>
public sealed class PublishReport
{
    public MigrationReport Migrations { get; } = new();
    public List<string> Views { get; } = new();
    public List<string> StoredProcedures { get; } = new();
    public List<string> Seeds { get; } = new();
    public List<string> DemoDataScripts { get; } = new();
}

public sealed class MigrationReport
{
    /// <summary>Migrations that ran on this publish.</summary>
    public List<string> Applied { get; } = new();

    /// <summary>Migrations already recorded against this database, left alone.</summary>
    public List<string> Skipped { get; } = new();
}
