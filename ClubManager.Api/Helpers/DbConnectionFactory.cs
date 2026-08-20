using System.Data;
using Microsoft.Data.SqlClient;

namespace ClubManager.Api.Helpers;

public interface IDbConnectionFactory
{
    /// <summary>Creates a new closed connection. Callers own it and must dispose it.</summary>
    IDbConnection CreateConnection();
}

/// <summary>Single place that knows how to build a SqlConnection from configuration.</summary>
public sealed class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is not configured.");
    }

    public IDbConnection CreateConnection() => new SqlConnection(_connectionString);
}
