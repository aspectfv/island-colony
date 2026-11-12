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

    public ObjectResult ToActionResult()
    {
        return new ObjectResult(this)
        {
            StatusCode = Status,
            ContentTypes = { "application/problem+json" }
        };
    }

    public static string CodeForStatus(int statusCode)
    {
        return statusCode switch
        {
            StatusCodes.Status400BadRequest => "VALIDATION_FAILED",
            StatusCodes.Status404NotFound => "NOT_FOUND",
            StatusCodes.Status405MethodNotAllowed => "METHOD_NOT_ALLOWED",
            StatusCodes.Status406NotAcceptable => "NOT_ACCEPTABLE",
            StatusCodes.Status415UnsupportedMediaType => "UNSUPPORTED_MEDIA_TYPE",
            >= 500 => "INTERNAL_ERROR",
            _ => "REQUEST_FAILED"
        };
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

    public static ApiProblemDetails SummaryExists(string sessionId)
    {
        return new ApiProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Session Summary Already Exists",
            Detail = $"A summary has already been recorded for sessionId '{sessionId}'.",
            Code = "SUMMARY_EXISTS"
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
