using Microsoft.Data.SqlClient;

namespace ClubManager.Database;

/// <summary>
/// Applies every database object in <c>database/</c> to a target server, in
/// dependency order, safely and repeatably.
///
/// <para>
/// Two kinds of script, handled differently:
/// </para>
/// <list type="bullet">
/// <item>
/// <b>Migrations</b> change schema, so they run exactly once and are recorded in
/// <c>dbo.__SchemaVersions</c>. Editing one after it has been applied is an
/// error the publisher refuses to paper over.
/// </item>
/// <item>
/// <b>Programmable objects</b> - views and stored procedures - are CREATE OR
/// ALTER, so they are simply re-applied every publish. The file is the single
/// source of truth for what the object should look like; there is no state to
/// track and no drift to accumulate.
/// </item>
/// </list>
///
/// <para>
/// Seed scripts run every publish too, and are written to be no-ops when the
/// data is already there.
/// </para>
/// </summary>
public sealed class DatabasePublisher
{
    private const string SchemaVersionsTable = "dbo.__SchemaVersions";

    private readonly PublishOptions _options;
    private readonly TextWriter _output;

    public DatabasePublisher(PublishOptions options, TextWriter output)
    {
        _options = options;
        _output = output;
    }

    public async Task<PublishReport> RunAsync(CancellationToken cancellationToken = default)
    {
        var report = new PublishReport();

        await EnsureDatabaseExistsAsync(cancellationToken);

        await using var connection = new SqlConnection(_options.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        // Pinned rather than assumed: a module that reads dbo.Players is only
        // valid when it is CREATEd with QUOTED_IDENTIFIER ON, because that table
        // carries filtered indexes. SqlClient already defaults both of these on,
        // so this is here to keep the requirement visible and deterministic.
        await ExecuteAsync(connection, "SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;", cancellationToken);

        await EnsureSchemaVersionsTableAsync(connection, cancellationToken);

        // 1. Tables, 2. indexes and constraints - both live in the migrations,
        // in the order their numeric prefixes give them.
        await ApplyMigrationsAsync(connection, report, cancellationToken);

        // 3. Views, then 4. stored procedures. Views first because a procedure
        // may read a view, never the other way round.
        await ApplyModulesAsync(connection, "Views", report.Views, cancellationToken);
        await ApplyModulesAsync(connection, "StoredProcedures", report.StoredProcedures, cancellationToken);

        // 5. Seed data, once the tables it writes to are guaranteed to exist.
        await ApplySeedAsync(connection, report, cancellationToken);

        if (_options.IncludeDemoData)
        {
            await ApplyDemoDataAsync(connection, report, cancellationToken);
        }

        return report;
    }

    /// <summary>
    /// Creates the database when it is missing, so a fresh clone needs nothing
    /// set up by hand. Connects to master, since the target may not exist yet.
    /// </summary>
    private async Task EnsureDatabaseExistsAsync(CancellationToken cancellationToken)
    {
        var builder = new SqlConnectionStringBuilder(_options.ConnectionString);
        var databaseName = builder.InitialCatalog;

        if (string.IsNullOrWhiteSpace(databaseName))
        {
            throw new InvalidOperationException(
                "The connection string must name a database (Initial Catalog / Database).");
        }

        builder.InitialCatalog = "master";

        await using var connection = new SqlConnection(builder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        // CREATE DATABASE takes no parameters, so the name has to be pasted in.
        // QUOTENAME is what makes that safe - it escapes and brackets the value,
        // and the name itself still travels as a parameter.
        const string sql = """
            IF DB_ID(@Name) IS NULL
            BEGIN
                DECLARE @Statement NVARCHAR(300) = N'CREATE DATABASE ' + QUOTENAME(@Name);
                EXEC sp_executesql @Statement;
            END
            """;

        await using var command = new SqlCommand(sql, connection) { CommandTimeout = _options.CommandTimeoutSeconds };
        command.Parameters.AddWithValue("@Name", databaseName);
        await command.ExecuteNonQueryAsync(cancellationToken);

        _output.WriteLine($"Target database : {databaseName} on {builder.DataSource}");
    }

    private async Task EnsureSchemaVersionsTableAsync(SqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = $"""
            IF OBJECT_ID('{SchemaVersionsTable}', 'U') IS NULL
            BEGIN
                CREATE TABLE {SchemaVersionsTable} (
                    SchemaVersionId INT IDENTITY(1,1) NOT NULL,
                    ScriptName      NVARCHAR(400)     NOT NULL,
                    Checksum        CHAR(64)          NOT NULL,
                    AppliedUtc      DATETIME2(0)      NOT NULL
                        CONSTRAINT DF___SchemaVersions_AppliedUtc DEFAULT (SYSUTCDATETIME()),
                    CONSTRAINT PK___SchemaVersions        PRIMARY KEY (SchemaVersionId),
                    CONSTRAINT UQ___SchemaVersions_Script UNIQUE (ScriptName)
                );
            END
            """;

        await ExecuteAsync(connection, sql, cancellationToken);
    }

    private async Task ApplyMigrationsAsync(
        SqlConnection connection, PublishReport report, CancellationToken cancellationToken)
    {
        var migrations = ScriptFile.LoadAll(_options.ScriptRoot, Path.Combine(_options.ScriptRoot, "Migrations"));
        var applied = await ReadAppliedMigrationsAsync(connection, cancellationToken);

        foreach (var migration in migrations)
        {
            if (applied.TryGetValue(migration.Name, out var recordedChecksum))
            {
                if (!string.Equals(recordedChecksum, migration.Checksum, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        $"Migration '{migration.Name}' has changed since it was applied to this database. " +
                        "An applied migration is history and must not be edited - the database it already " +
                        "ran against will never see the edit. Restore the file and add a new migration " +
                        "for the change instead.");
                }

                report.Migrations.Skipped.Add(migration.Name);
                continue;
            }

            // One transaction per migration: a migration that fails half way
            // leaves nothing behind, and is not recorded, so the next publish
            // retries it from a clean slate. DDL is transactional in SQL Server.
            await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

            try
            {
                foreach (var batch in SqlBatch.Split(migration.Content))
                {
                    await ExecuteAsync(connection, batch, cancellationToken, transaction);
                }

                await RecordMigrationAsync(connection, transaction, migration, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }

            report.Migrations.Applied.Add(migration.Name);
            _output.WriteLine($"  applied  {migration.Name}");
        }
    }

    private async Task<Dictionary<string, string>> ReadAppliedMigrationsAsync(
        SqlConnection connection, CancellationToken cancellationToken)
    {
        var applied = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        await using var command = new SqlCommand(
            $"SELECT ScriptName, Checksum FROM {SchemaVersionsTable};", connection)
        {
            CommandTimeout = _options.CommandTimeoutSeconds
        };

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            applied[reader.GetString(0)] = reader.GetString(1);
        }

        return applied;
    }

    private async Task RecordMigrationAsync(
        SqlConnection connection, SqlTransaction transaction, ScriptFile migration, CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            $"INSERT INTO {SchemaVersionsTable} (ScriptName, Checksum) VALUES (@ScriptName, @Checksum);",
            connection,
            transaction)
        {
            CommandTimeout = _options.CommandTimeoutSeconds
        };

        command.Parameters.AddWithValue("@ScriptName", migration.Name);
        command.Parameters.AddWithValue("@Checksum", migration.Checksum);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Applies every CREATE OR ALTER module under <paramref name="folder"/>.
    /// </summary>
    /// <remarks>
    /// Files are attempted in name order and the failures are retried, as long as
    /// each pass gets at least one more of them in. That resolves dependencies
    /// between modules without anyone having to maintain a manifest: a view built
    /// on another view simply succeeds on the second pass. When a pass fixes
    /// nothing, the remaining errors are real and get reported together.
    /// </remarks>
    private async Task ApplyModulesAsync(
        SqlConnection connection, string folder, List<string> applied, CancellationToken cancellationToken)
    {
        var pending = ScriptFile
            .LoadAll(_options.ScriptRoot, Path.Combine(_options.ScriptRoot, folder))
            .ToList();

        while (pending.Count > 0)
        {
            var failures = new List<(ScriptFile Script, Exception Error)>();

            foreach (var module in pending)
            {
                try
                {
                    foreach (var batch in SqlBatch.Split(module.Content))
                    {
                        await ExecuteAsync(connection, batch, cancellationToken);
                    }

                    applied.Add(module.Name);
                }
                catch (SqlException error)
                {
                    failures.Add((module, error));
                }
            }

            if (failures.Count == pending.Count)
            {
                var detail = string.Join(
                    Environment.NewLine,
                    failures.Select(failure => $"  {failure.Script.Name}: {failure.Error.Message}"));

                throw new InvalidOperationException(
                    $"{failures.Count} object(s) in {folder} could not be deployed:{Environment.NewLine}{detail}");
            }

            pending = failures.Select(failure => failure.Script).ToList();
        }
    }

    private async Task ApplySeedAsync(
        SqlConnection connection, PublishReport report, CancellationToken cancellationToken)
    {
        foreach (var seed in ScriptFile.LoadAll(_options.ScriptRoot, Path.Combine(_options.ScriptRoot, "Seed")))
        {
            foreach (var batch in SqlBatch.Split(seed.Content))
            {
                await ExecuteAsync(connection, batch, cancellationToken);
            }

            report.Seeds.Add(seed.Name);
        }
    }

    /// <summary>
    /// Demo data is destructive - it wipes and reseeds every table - so it is
    /// never part of a normal publish and only runs when explicitly asked for.
    /// </summary>
    private async Task ApplyDemoDataAsync(
        SqlConnection connection, PublishReport report, CancellationToken cancellationToken)
    {
        var directory = Path.Combine(_options.ScriptRoot, "DemoData");

        foreach (var script in ScriptFile.LoadAll(_options.ScriptRoot, directory))
        {
            foreach (var batch in SqlBatch.Split(script.Content))
            {
                await ExecuteAsync(connection, batch, cancellationToken);
            }

            report.DemoDataScripts.Add(script.Name);
            _output.WriteLine($"  demo     {script.Name}");
        }
    }

    private async Task ExecuteAsync(
        SqlConnection connection,
        string sql,
        CancellationToken cancellationToken,
        SqlTransaction? transaction = null)
    {
        await using var command = new SqlCommand(sql, connection, transaction)
        {
            CommandTimeout = _options.CommandTimeoutSeconds
        };

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
