namespace ClubManager.Api.Models;

/// <summary>
/// Outcome of a service-layer call. Lets services report an expected failure
/// (bad credentials, duplicate username, forbidden team) without throwing,
/// and lets controllers map that failure onto the right HTTP status code.
/// </summary>
public class ServiceResult<T>
{
    public bool Succeeded { get; init; }
    public T? Value { get; init; }
    public string? Error { get; init; }
    public ServiceErrorType ErrorType { get; init; }

    public static ServiceResult<T> Ok(T value) =>
        new() { Succeeded = true, Value = value };

    public static ServiceResult<T> Fail(string error, ServiceErrorType type = ServiceErrorType.Validation) =>
        new() { Succeeded = false, Error = error, ErrorType = type };
}

public enum ServiceErrorType
{
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden
}
