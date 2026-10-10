using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MetadataService.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace MetadataService.Tests;

public class SessionsEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SessionsEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateSession_ValidPayload_Returns201CreatedAndCanBeFetched()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();
        var peerPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();

        var request = new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = hostPlayerId,
            WorldSeed = 1234567,
            StartedAt = DateTimeOffset.UtcNow,
            Participants =
            [
                new Participant { PlayerId = hostPlayerId, DisplayName = "HostPlayer", Slot = 0 },
                new Participant { PlayerId = peerPlayerId, DisplayName = "PeerPlayer", Slot = 1 }
            ]
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        Assert.Contains($"/api/v1/sessions/{sessionId}", response.Headers.Location.ToString());

        var record = await response.Content.ReadFromJsonAsync<SessionRecord>();
        Assert.NotNull(record);
        Assert.Equal(sessionId, record.SessionId);
        Assert.Equal("ABCDEF", record.LobbyCode);
        Assert.Equal(hostPlayerId, record.HostPlayerId);
        Assert.Equal(1234567, record.WorldSeed);
        Assert.Equal(SessionRecordStatus.Active, record.Status);
        Assert.Null(record.Summary);
        Assert.Null(record.DurationSeconds);
        Assert.Equal(2, record.Participants.Count);

        // Verify GET /api/v1/sessions/{sessionId}
        var getResponse = await _client.GetAsync($"/api/v1/sessions/{sessionId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var fetchedRecord = await getResponse.Content.ReadFromJsonAsync<SessionRecord>();
        Assert.NotNull(fetchedRecord);
        Assert.Equal(sessionId, fetchedRecord.SessionId);
        Assert.Equal(SessionRecordStatus.Active, fetchedRecord.Status);
    }

    [Fact]
    public async Task CreateSession_DuplicateSessionId_Returns409Conflict_WithProblemJson()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();

        var request = new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = hostPlayerId,
            WorldSeed = 42,
            StartedAt = DateTimeOffset.UtcNow,
            Participants =
            [
                new Participant { PlayerId = hostPlayerId, DisplayName = "HostPlayer", Slot = 0 }
            ]
        };

        var initialResponse = await _client.PostAsJsonAsync("/api/v1/sessions", request);
        Assert.Equal(HttpStatusCode.Created, initialResponse.StatusCode);

        var duplicateResponse = await _client.PostAsJsonAsync("/api/v1/sessions", request);
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        Assert.NotNull(duplicateResponse.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", duplicateResponse.Content.Headers.ContentType.MediaType);

        var problem = await duplicateResponse.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("SESSION_EXISTS", problem.Code);
        Assert.Equal(409, problem.Status);
    }

    [Fact]
    public async Task CreateSession_InvalidModel_Returns400BadRequest_WithValidationFailedProblem()
    {
        // Invalid seed (< 0), invalid lobbyCode (has invalid characters), empty participants
        var invalidPayload = new
        {
            sessionId = "not-a-uuid",
            lobbyCode = "1234",
            hostPlayerId = "not-a-uuid",
            worldSeed = -1,
            startedAt = "invalid-date",
            participants = Array.Empty<object>()
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", invalidPayload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.Equal(400, problem.Status);
        Assert.NotNull(problem.Errors);
        Assert.NotEmpty(problem.Errors);
    }

    [Fact]
    public async Task CreateSession_DuplicateParticipantSlot_Returns400BadRequest()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();
        var otherPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();

        var request = new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "XYZ789",
            HostPlayerId = hostPlayerId,
            WorldSeed = 999,
            StartedAt = DateTimeOffset.UtcNow,
            Participants =
            [
                new Participant { PlayerId = hostPlayerId, DisplayName = "Host", Slot = 0 },
                new Participant { PlayerId = otherPlayerId, DisplayName = "Peer", Slot = 0 } // Duplicate slot 0
            ]
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Message.Contains("duplicated", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task GetSession_NotFound_Returns404_WithProblemJson()
    {
        var unknownSessionId = Guid.NewGuid().ToString().ToLowerInvariant();

        var response = await _client.GetAsync($"/api/v1/sessions/{unknownSessionId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("SESSION_NOT_FOUND", problem.Code);
        Assert.Equal(404, problem.Status);
    }

    [Fact]
    public async Task Cors_AllowedOrigin_ReturnsAccessControlAllowOrigin()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.Equal("http://localhost:5173", response.Headers.GetValues("Access-Control-Allow-Origin").FirstOrDefault());
    }
}
