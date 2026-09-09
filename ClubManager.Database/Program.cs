using ClubManager.Database;

if (args.Contains("--help") || args.Contains("-h"))
{
    Console.WriteLine(
        """
        ClubManager database publisher

          dotnet run --project ClubManager.Database [options]

        Applies every database object under database/ to the target server, in
        dependency order. Safe to run repeatedly.

        Options
          --connection <value>   Connection string. Defaults to the environment
                                 variable CLUBMANAGER_CONNECTION, then to the
                                 value in appsettings.json.
          --scripts <path>       Folder holding Migrations/, Views/,
                                 StoredProcedures/, Seed/ and DemoData/.
                                 Defaults to the database/ folder shipped
                                 alongside this tool.
          --demo-data            Also run database/DemoData. DESTRUCTIVE: it
                                 wipes and reseeds every table apart from Admin
                                 logins. Never part of a normal publish.
          --help, -h             This text.
        """);

    return 0;
}

try
{
    var options = CommandLine.BuildOptions(args);

    Console.WriteLine("ClubManager database publish");
    Console.WriteLine($"Scripts         : {options.ScriptRoot}");

    var publisher = new DatabasePublisher(options, Console.Out);
    var report = await publisher.RunAsync();

    Console.WriteLine();
    Console.WriteLine("Publish complete");
    Console.WriteLine($"  migrations applied : {report.Migrations.Applied.Count}");
    Console.WriteLine($"  migrations skipped : {report.Migrations.Skipped.Count} (already recorded)");
    Console.WriteLine($"  views              : {report.Views.Count}");
    Console.WriteLine($"  stored procedures  : {report.StoredProcedures.Count}");
    Console.WriteLine($"  seed scripts       : {report.Seeds.Count}");

    if (report.DemoDataScripts.Count > 0)
    {
        Console.WriteLine($"  demo data scripts  : {report.DemoDataScripts.Count}");
    }

    return 0;
}
catch (Exception exception)
{
    Console.Error.WriteLine();
    Console.Error.WriteLine("Publish FAILED");
    Console.Error.WriteLine(exception.Message);

    // Nothing was committed that should not have been - migrations run one
    // transaction each - so the fix is to correct the script and run again.
    return 1;
}
