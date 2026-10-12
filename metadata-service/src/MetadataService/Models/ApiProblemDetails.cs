using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace MetadataService.Models;

public class ApiProblemDetails : ProblemDetails
{
    [JsonPropertyName("code")]
    public required string Code { get; set; }

    [JsonPropertyName("errors")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ValidationError>? Errors { get; set; }

    public ApiProblemDetails()
    {
        Type = "about:blank";
    }

    public static ApiProblemDetails ValidationFailed(List<ValidationError> errors, string? detail = null)
    {
        return new ApiProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Validation Failed",
            Detail = detail ?? "One or more validation errors occurred.",
            Code = "VALIDATION_FAILED",
            Errors = errors
        };
    }

    public static ApiProblemDetails SessionNotFound(string sessionId)
    {
        return new ApiProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Session Not Found",
            Detail = $"No session record exists with sessionId '{sessionId}'.",
            Code = "SESSION_NOT_FOUND"
        };
    }

    public static ApiProblemDetails SessionExists(string sessionId)
    {
        return new ApiProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Session Already Exists",
            Detail = $"A session record already exists with sessionId '{sessionId}'.",
            Code = "SESSION_EXISTS"
        };
    }

    public static ApiProblemDetails InternalError(string? detail = null)
    {
        return new ApiProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Internal Server Error",
            Detail = detail ?? "An unexpected error occurred.",
            Code = "INTERNAL_ERROR"
        };
    }
}
