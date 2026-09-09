using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;

namespace ClubManager.Api.Middleware;

/// <summary>
/// Turns a database error into a response that says something useful without
/// saying anything about the database.
///
/// <para>
/// The stored procedures in <c>database/06_stored_procedures.sql</c> raise their
/// integrity failures with THROW and an error number of 50000 or above - jersey
/// number already taken, login already linked to another player, a completed
/// match with no score. Those messages are written to be safe to show a user, so
/// they go back as 409 Conflict.
/// </para>
/// <para>
/// Every other SqlException is the database talking about itself - constraint
/// names, column names, server names - so only a generic 500 goes out and the
/// detail goes to the log.
/// </para>
/// <para>
/// The 409 branch is rare by design: the services validate up front and return
/// their own, friendlier message. It fires when two writers race, or when a row
/// was edited outside the API.
/// </para>
/// </summary>
public sealed class DatabaseExceptionHandler : IExceptionHandler
{
    /// <summary>SQL Server reserves every error number below this for itself.</summary>
    private const int FirstApplicationErrorNumber = 50000;

    private readonly ILogger<DatabaseExceptionHandler> _logger;

    public DatabaseExceptionHandler(ILogger<DatabaseExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not SqlException sqlException)
        {
            // Not ours - let the rest of the pipeline deal with it.
            return false;
        }

        if (sqlException.Number >= FirstApplicationErrorNumber)
        {
            _logger.LogWarning(sqlException,
                "A database rule rejected {Method} {Path} (error {Number}).",
                httpContext.Request.Method, httpContext.Request.Path, sqlException.Number);

            await Results
                .Problem(detail: sqlException.Message, statusCode: StatusCodes.Status409Conflict)
                .ExecuteAsync(httpContext);

            return true;
        }

        _logger.LogError(sqlException,
            "Unhandled database error on {Method} {Path} (error {Number}).",
            httpContext.Request.Method, httpContext.Request.Path, sqlException.Number);

        await Results
            .Problem(detail: "The request could not be completed.", statusCode: StatusCodes.Status500InternalServerError)
            .ExecuteAsync(httpContext);

        return true;
    }
}
