using ClubManager.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace ClubManager.Api.Controllers;

/// <summary>Shared plumbing for the API controllers: maps a failed
/// <see cref="ServiceResult{T}"/> onto the matching HTTP status code.</summary>
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected ObjectResult ToErrorResult<T>(ServiceResult<T> result)
    {
        var status = result.ErrorType switch
        {
            ServiceErrorType.NotFound => StatusCodes.Status404NotFound,
            ServiceErrorType.Conflict => StatusCodes.Status409Conflict,
            ServiceErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ServiceErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status400BadRequest
        };

        return Problem(detail: result.Error, statusCode: status);
    }
}
