using MetadataService.Models;
using MetadataService.Results;
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
    [Produces("application/json", "application/problem+json")]
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
            return new ProblemDetailsResult(ApiProblemDetails.SessionExists(request.SessionId));
        }

        return CreatedAtAction(nameof(GetSessionRecord), new { sessionId = record.SessionId }, record);
    }

    [HttpGet("{sessionId}")]
    [Produces("application/json", "application/problem+json")]
    [ProducesResponseType(typeof(SessionRecord), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetSessionRecord([FromRoute] string sessionId)
    {
        var record = _sessionRepository.GetSession(sessionId);
        if (record == null)
        {
            return new ProblemDetailsResult(ApiProblemDetails.SessionNotFound(sessionId));
        }

        return Ok(record);
    }
}
