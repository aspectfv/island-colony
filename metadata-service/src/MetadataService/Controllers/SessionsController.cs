using MetadataService.Models;
using MetadataService.Storage;
using Microsoft.AspNetCore.Mvc;

namespace MetadataService.Controllers;

[ApiController]
[Route("api/v1/sessions")]
public class SessionsController : ControllerBase
{
    private readonly ISessionRepository _sessionRepository;

    public SessionsController(ISessionRepository sessionRepository)
    {
        _sessionRepository = sessionRepository;
    }

    [HttpPost]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(SessionRecord), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status409Conflict)]
    public IActionResult CreateSessionRecord([FromBody] CreateSessionRecordRequest request)
    {
        var record = new SessionRecord
        {
            SessionId = request.SessionId,
            LobbyCode = request.LobbyCode,
            HostPlayerId = request.HostPlayerId,
            WorldSeed = request.WorldSeed,
            StartedAt = request.StartedAt,
            Participants = request.Participants,
            Status = SessionRecordStatus.Active,
            Summary = null
        };

        if (!_sessionRepository.TryCreateSession(record))
        {
            return ApiProblemDetails.SessionExists(request.SessionId).ToActionResult();
        }

        return CreatedAtAction(nameof(GetSessionRecord), new { sessionId = record.SessionId }, record);
    }

    [HttpGet]
    [ProducesResponseType(typeof(SessionRecordList), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
    public IActionResult ListSessionRecords([FromQuery] string? status = null, [FromQuery] int limit = 20)
    {
        var errors = new List<ValidationError>();

        bool hasStatusQuery = Request.Query.ContainsKey("status");
        if (hasStatusQuery && !SessionRecordStatus.IsValid(status))
        {
            errors.Add(new ValidationError("status", "status must be one of ACTIVE, COMPLETED, or ENDED."));
        }

        if (limit < 1 || limit > 100)
        {
            errors.Add(new ValidationError("limit", "limit must be between 1 and 100."));
        }

        if (errors.Count > 0)
        {
            return ApiProblemDetails.ValidationFailed(errors).ToActionResult();
        }

        var items = _sessionRepository.ListSessions(status, limit);
        return Ok(new SessionRecordList { Items = items });
    }

    [HttpGet("{sessionId}")]
    [ProducesResponseType(typeof(SessionRecord), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetSessionRecord([FromRoute] string sessionId)
    {
        var record = _sessionRepository.GetSession(sessionId);
        if (record == null)
        {
            return ApiProblemDetails.SessionNotFound(sessionId).ToActionResult();
        }

        return Ok(record);
    }

    [HttpPost("{sessionId}/summary")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(SessionRecord), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status409Conflict)]
    public IActionResult PostSessionSummary([FromRoute] string sessionId, [FromBody] SessionSummary summary)
    {
        var existing = _sessionRepository.GetSession(sessionId);
        if (existing == null)
        {
            return ApiProblemDetails.SessionNotFound(sessionId).ToActionResult();
        }

        if (existing.Summary != null)
        {
            return ApiProblemDetails.SummaryExists(sessionId).ToActionResult();
        }

        var consistencyErrors = summary.ValidateAgainstSession(existing);
        if (consistencyErrors.Count > 0)
        {
            return ApiProblemDetails.ValidationFailed(consistencyErrors).ToActionResult();
        }

        var newStatus = summary.Outcome == SessionRecordStatus.Completed
            ? SessionRecordStatus.Completed
            : SessionRecordStatus.Ended;
        var durationSeconds = (int)(summary.EndedAt - existing.StartedAt).TotalSeconds;

        var updated = existing with
        {
            Status = newStatus,
            DurationSeconds = durationSeconds,
            Summary = summary
        };

        if (!_sessionRepository.TryUpdateSession(existing, updated))
        {
            return ApiProblemDetails.SummaryExists(sessionId).ToActionResult();
        }

        return Ok(updated);
    }
}
