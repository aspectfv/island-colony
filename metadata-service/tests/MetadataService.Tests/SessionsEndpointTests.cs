using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using MetadataService.Models;
using MetadataService.Storage;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace MetadataService.Tests;

public class SessionsEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public SessionsEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateSession_ValidPayload_Returns201CreatedAndCanBeFetched()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();
        var peerPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();

        // Send a +02:00 offset timestamp to verify normalization to UTC and serialization with "Z"
        var startedAtWithOffset = new DateTimeOffset(2026, 10, 13, 14, 0, 0, TimeSpan.FromHours(2));

        var request = new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = hostPlayerId,
            WorldSeed = 1234567,
            StartedAt = startedAtWithOffset,
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

        var rawJson = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(rawJson, "SessionRecord");

        using var jsonDoc = JsonDocument.Parse(rawJson);
        Assert.Equal("2026-10-13T12:00:00Z", jsonDoc.RootElement.GetProperty("startedAt").GetString());

        var record = JsonSerializer.Deserialize<SessionRecord>(rawJson);
        Assert.NotNull(record);
        Assert.Equal(sessionId, record.SessionId);
        Assert.Equal("ABCDEF", record.LobbyCode);
        Assert.Equal(hostPlayerId, record.HostPlayerId);
        Assert.Equal(1234567, record.WorldSeed);
        Assert.Equal(TimeSpan.Zero, record.StartedAt.Offset);
        Assert.Equal(new DateTimeOffset(2026, 10, 13, 12, 0, 0, TimeSpan.Zero), record.StartedAt);
        Assert.Equal(SessionRecordStatus.Active, record.Status);
        Assert.Null(record.Summary);
        Assert.Null(record.DurationSeconds);
        Assert.Equal(2, record.Participants.Count);

        // Verify GET /api/v1/sessions/{sessionId}
        var getResponse = await _client.GetAsync($"/api/v1/sessions/{sessionId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var getRawJson = await getResponse.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(getRawJson, "SessionRecord");

        using var getJsonDoc = JsonDocument.Parse(getRawJson);
        Assert.Equal("2026-10-13T12:00:00Z", getJsonDoc.RootElement.GetProperty("startedAt").GetString());

        var fetchedRecord = JsonSerializer.Deserialize<SessionRecord>(getRawJson);
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

        var rawProblem = await duplicateResponse.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = JsonSerializer.Deserialize<ApiProblemDetails>(rawProblem);
        Assert.NotNull(problem);
        Assert.Equal("SESSION_EXISTS", problem.Code);
        Assert.Equal(409, problem.Status);
    }

    [Fact]
    public async Task CreateSession_InvalidJson_Returns400BadRequest_WithCleanFieldAndFixedMessage()
    {
        var invalidJsonPayload = new
        {
            sessionId = Guid.NewGuid().ToString().ToLowerInvariant(),
            lobbyCode = "ABCDEF",
            hostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant(),
            worldSeed = 42,
            startedAt = "invalid-date",
            participants = Array.Empty<object>()
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", invalidJsonPayload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.Equal(400, problem.Status);
        Assert.NotNull(problem.Errors);
        Assert.DoesNotContain(problem.Errors, e => e.Field == "request");
        var startedAtError = Assert.Single(problem.Errors, e => e.Field == "startedAt");
        Assert.Equal("Invalid JSON value.", startedAtError.Message);
    }

    [Fact]
    public async Task CreateSession_InvalidAttributes_Returns400BadRequest_WithValidationFailedProblem()
    {
        var invalidAttributesPayload = new
        {
            sessionId = "not-a-uuid",
            lobbyCode = "1234",
            hostPlayerId = "not-a-uuid",
            worldSeed = -1,
            startedAt = "2026-10-13T12:00:00Z",
            participants = Array.Empty<object>()
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", invalidAttributesPayload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.Equal(400, problem.Status);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Field == "sessionId");
        Assert.Contains(problem.Errors, e => e.Field == "lobbyCode");
        Assert.Contains(problem.Errors, e => e.Field == "hostPlayerId");
        Assert.Contains(problem.Errors, e => e.Field == "worldSeed");
        Assert.Contains(problem.Errors, e => e.Field == "participants");
    }

    [Fact]
    public async Task CreateSession_NullParticipantEntry_Returns400BadRequest_WithParticipantIndexField()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();

        var payloadWithNullParticipant = new
        {
            sessionId,
            lobbyCode = "ABCDEF",
            hostPlayerId,
            worldSeed = 42,
            startedAt = "2026-10-13T12:00:00Z",
            participants = new object?[]
            {
                new { playerId = hostPlayerId, displayName = "HostPlayer", slot = 0 },
                null
            }
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", payloadWithNullParticipant);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.Equal(400, problem.Status);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Field == "participants[1]");
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
                new Participant { PlayerId = otherPlayerId, DisplayName = "Peer", Slot = 0 }
            ]
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Message.Contains("duplicated", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CreateSession_DuplicateParticipantPlayerId_Returns400BadRequest()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant();

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
                new Participant { PlayerId = hostPlayerId, DisplayName = "HostClone", Slot = 1 }
            ]
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Field == "participants[1].playerId");
    }

    [Fact]
    public async Task CreateSession_HostNotInParticipants_Returns400BadRequest()
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
                new Participant { PlayerId = otherPlayerId, DisplayName = "Peer", Slot = 0 }
            ]
        };

        var response = await _client.PostAsJsonAsync("/api/v1/sessions", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Field == "hostPlayerId");
    }

    [Fact]
    public async Task PostSummary_CompletedOutcome_SetsCompletedStatusAndDuration_AndRejectsSecondSummaryWith409()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostId = "3f6c2a1e-8b4d-4c2e-9a71-0d5e2b7c4f10";
        var peer1Id = "9b1e7d42-5c3a-4f8e-b6d0-2a4c8e1f3b57";
        var peer2Id = "c42d8f10-7e6b-4a19-8d35-6f0b2e9a1c84";
        var startedAt = new DateTimeOffset(2026, 10, 7, 12, 2, 0, TimeSpan.Zero);

        var createRequest = new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "K7QX2M",
            HostPlayerId = hostId,
            WorldSeed = 1234,
            StartedAt = startedAt,
            Participants =
            [
                new Participant { PlayerId = hostId, DisplayName = "Aspect", Slot = 0 },
                new Participant { PlayerId = peer1Id, DisplayName = "Rami", Slot = 1 },
                new Participant { PlayerId = peer2Id, DisplayName = "Roku", Slot = 2 }
            ]
        };

        var createResp = await _client.PostAsJsonAsync("/api/v1/sessions", createRequest);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var summary = new SessionSummary
        {
            Outcome = "COMPLETED",
            EndedAt = new DateTimeOffset(2026, 10, 7, 12, 31, 40, TimeSpan.Zero),
            ObjectivesCompleted = 4,
            Structures =
            [
                new PlacedStructureSummary
                {
                    StructureType = "camp",
                    PlacedBy = hostId,
                    PlacedAt = new DateTimeOffset(2026, 10, 7, 12, 9, 2, TimeSpan.Zero)
                },
                new PlacedStructureSummary
                {
                    StructureType = "storage-hut",
                    PlacedBy = peer1Id,
                    PlacedAt = new DateTimeOffset(2026, 10, 7, 12, 18, 47, TimeSpan.Zero)
                },
                new PlacedStructureSummary
                {
                    StructureType = "signal-beacon",
                    PlacedBy = peer2Id,
                    PlacedAt = new DateTimeOffset(2026, 10, 7, 12, 31, 40, TimeSpan.Zero)
                }
            ],
            TotalGathered = new Dictionary<string, int>
            {
                ["wood"] = 125,
                ["stone"] = 72
            },
            Contributions =
            [
                new Contribution
                {
                    PlayerId = hostId,
                    Gathered = new Dictionary<string, int> { ["wood"] = 45, ["stone"] = 27 },
                    StructuresPlaced = 1
                },
                new Contribution
                {
                    PlayerId = peer1Id,
                    Gathered = new Dictionary<string, int> { ["wood"] = 50, ["stone"] = 21 },
                    StructuresPlaced = 1
                },
                new Contribution
                {
                    PlayerId = peer2Id,
                    Gathered = new Dictionary<string, int> { ["wood"] = 30, ["stone"] = 24 },
                    StructuresPlaced = 1
                }
            ]
        };

        var summaryResp = await _client.PostAsJsonAsync($"/api/v1/sessions/{sessionId}/summary", summary);
        Assert.Equal(HttpStatusCode.OK, summaryResp.StatusCode);

        var rawJson = await summaryResp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(rawJson, "SessionRecord");

        var updated = JsonSerializer.Deserialize<SessionRecord>(rawJson);
        Assert.NotNull(updated);
        Assert.Equal(SessionRecordStatus.Completed, updated.Status);
        Assert.Equal(1780, updated.DurationSeconds);
        Assert.NotNull(updated.Summary);
        Assert.Equal("COMPLETED", updated.Summary.Outcome);

        // Posting a second summary returns 409 SUMMARY_EXISTS
        var duplicateResp = await _client.PostAsJsonAsync($"/api/v1/sessions/{sessionId}/summary", summary);
        Assert.Equal(HttpStatusCode.Conflict, duplicateResp.StatusCode);
        Assert.Equal("application/problem+json", duplicateResp.Content.Headers.ContentType?.MediaType);

        var rawProblem = await duplicateResp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = JsonSerializer.Deserialize<ApiProblemDetails>(rawProblem);
        Assert.NotNull(problem);
        Assert.Equal("SUMMARY_EXISTS", problem.Code);
        Assert.Equal(409, problem.Status);
    }

    [Fact]
    public async Task PostSummary_HostEndedOutcome_SetsEndedStatus()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostId = Guid.NewGuid().ToString().ToLowerInvariant();
        var startedAt = new DateTimeOffset(2026, 10, 7, 12, 2, 0, TimeSpan.Zero);

        await _client.PostAsJsonAsync("/api/v1/sessions", new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = hostId,
            WorldSeed = 42,
            StartedAt = startedAt,
            Participants =
            [
                new Participant { PlayerId = hostId, DisplayName = "Host", Slot = 0 }
            ]
        });

        var summary = new SessionSummary
        {
            Outcome = "HOST_ENDED",
            EndedAt = startedAt.AddSeconds(610),
            ObjectivesCompleted = 1,
            Structures = [],
            TotalGathered = new Dictionary<string, int> { ["wood"] = 10 },
            Contributions =
            [
                new Contribution
                {
                    PlayerId = hostId,
                    Gathered = new Dictionary<string, int> { ["wood"] = 10 },
                    StructuresPlaced = 0
                }
            ]
        };

        var resp = await _client.PostAsJsonAsync($"/api/v1/sessions/{sessionId}/summary", summary);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var rawJson = await resp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(rawJson, "SessionRecord");

        var updated = JsonSerializer.Deserialize<SessionRecord>(rawJson);
        Assert.NotNull(updated);
        Assert.Equal(SessionRecordStatus.Ended, updated.Status);
        Assert.Equal(610, updated.DurationSeconds);
    }

    [Fact]
    public async Task PostSummary_UnknownSession_Returns404_SessionNotFound()
    {
        var unknownSessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostId = Guid.NewGuid().ToString().ToLowerInvariant();

        var summary = new SessionSummary
        {
            Outcome = "COMPLETED",
            EndedAt = DateTimeOffset.UtcNow,
            ObjectivesCompleted = 1,
            Structures = [],
            TotalGathered = new Dictionary<string, int>(),
            Contributions =
            [
                new Contribution
                {
                    PlayerId = hostId,
                    Gathered = new Dictionary<string, int>(),
                    StructuresPlaced = 0
                }
            ]
        };

        var resp = await _client.PostAsJsonAsync($"/api/v1/sessions/{unknownSessionId}/summary", summary);
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);

        var rawProblem = await resp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = JsonSerializer.Deserialize<ApiProblemDetails>(rawProblem);
        Assert.NotNull(problem);
        Assert.Equal("SESSION_NOT_FOUND", problem.Code);
        Assert.Equal(404, problem.Status);
    }

    [Fact]
    public async Task PostSummary_ConsistencyViolations_Return400ValidationFailed()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var hostId = Guid.NewGuid().ToString().ToLowerInvariant();
        var nonParticipantId = Guid.NewGuid().ToString().ToLowerInvariant();
        var startedAt = new DateTimeOffset(2026, 10, 7, 12, 0, 0, TimeSpan.Zero);

        await _client.PostAsJsonAsync("/api/v1/sessions", new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = hostId,
            WorldSeed = 42,
            StartedAt = startedAt,
            Participants =
            [
                new Participant { PlayerId = hostId, DisplayName = "Host", Slot = 0 }
            ]
        });

        // 1. structuresPlaced sum mismatch and gathered sum mismatch
        var mismatchedSumsSummary = new SessionSummary
        {
            Outcome = "COMPLETED",
            EndedAt = startedAt.AddMinutes(10),
            ObjectivesCompleted = 1,
            Structures = [],
            TotalGathered = new Dictionary<string, int> { ["wood"] = 50 },
            Contributions =
            [
                new Contribution
                {
                    PlayerId = hostId,
                    Gathered = new Dictionary<string, int> { ["wood"] = 20 },
                    StructuresPlaced = 2 // mismatch: 2 != 0 structures
                }
            ]
        };

        var mismatchResp = await _client.PostAsJsonAsync($"/api/v1/sessions/{sessionId}/summary", mismatchedSumsSummary);
        Assert.Equal(HttpStatusCode.BadRequest, mismatchResp.StatusCode);
        var mismatchProblemJson = await mismatchResp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(mismatchProblemJson, "Problem");
        var mismatchProblem = JsonSerializer.Deserialize<ApiProblemDetails>(mismatchProblemJson);
        Assert.NotNull(mismatchProblem);
        Assert.Equal("VALIDATION_FAILED", mismatchProblem.Code);
        Assert.NotNull(mismatchProblem.Errors);
        Assert.Contains(mismatchProblem.Errors, e => e.Field == "structures");
        Assert.Contains(mismatchProblem.Errors, e => e.Field == "totalGathered.wood");

        // 2. Non-participant in contributions and structures, plus endedAt < startedAt
        var sessionRelativeInvalidSummary = new SessionSummary
        {
            Outcome = "COMPLETED",
            EndedAt = startedAt.AddMinutes(-5), // earlier than startedAt
            ObjectivesCompleted = 0,
            Structures =
            [
                new PlacedStructureSummary
                {
                    StructureType = "camp",
                    PlacedBy = nonParticipantId,
                    PlacedAt = startedAt
                }
            ],
            TotalGathered = new Dictionary<string, int>(),
            Contributions =
            [
                new Contribution
                {
                    PlayerId = nonParticipantId,
                    Gathered = new Dictionary<string, int>(),
                    StructuresPlaced = 1
                }
            ]
        };

        var sessionRelResp = await _client.PostAsJsonAsync($"/api/v1/sessions/{sessionId}/summary", sessionRelativeInvalidSummary);
        Assert.Equal(HttpStatusCode.BadRequest, sessionRelResp.StatusCode);
        var sessionRelProblemJson = await sessionRelResp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(sessionRelProblemJson, "Problem");
        var sessionRelProblem = JsonSerializer.Deserialize<ApiProblemDetails>(sessionRelProblemJson);
        Assert.NotNull(sessionRelProblem);
        Assert.Equal("VALIDATION_FAILED", sessionRelProblem.Code);
        Assert.NotNull(sessionRelProblem.Errors);
        Assert.Contains(sessionRelProblem.Errors, e => e.Field == "endedAt");
        Assert.Contains(sessionRelProblem.Errors, e => e.Field == "structures[0].placedBy");
        Assert.Contains(sessionRelProblem.Errors, e => e.Field == "contributions[0].playerId");
    }

    [Fact]
    public async Task ListSessions_OrdersNewestFirst_SupportsStatusFilterAndLimit()
    {
        using var isolatedFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<ISessionRepository>();
                services.AddSingleton<ISessionRepository, InMemorySessionRepository>();
            });
        });
        using var client = isolatedFactory.CreateClient();

        var hostId = Guid.NewGuid().ToString().ToLowerInvariant();
        var olderSessionId = "11111111-1111-4111-8111-111111111111";
        var newerSessionId = "22222222-2222-4222-8222-222222222222";
        var newestSessionId = "33333333-3333-4333-8333-333333333333";

        var t0 = new DateTimeOffset(2026, 10, 7, 10, 0, 0, TimeSpan.Zero);

        foreach (var (id, start) in new[] { (olderSessionId, t0), (newerSessionId, t0.AddHours(1)), (newestSessionId, t0.AddHours(2)) })
        {
            var createResp = await client.PostAsJsonAsync("/api/v1/sessions", new CreateSessionRecordRequest
            {
                SessionId = id,
                LobbyCode = "ABCDEF",
                HostPlayerId = hostId,
                WorldSeed = 1,
                StartedAt = start,
                Participants = [new Participant { PlayerId = hostId, DisplayName = "Host", Slot = 0 }]
            });
            Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        }

        // Complete newerSessionId and end olderSessionId
        await client.PostAsJsonAsync($"/api/v1/sessions/{newerSessionId}/summary", new SessionSummary
        {
            Outcome = "COMPLETED",
            EndedAt = t0.AddHours(1).AddMinutes(15),
            ObjectivesCompleted = 3,
            Structures = [],
            TotalGathered = new Dictionary<string, int>(),
            Contributions = [new Contribution { PlayerId = hostId, Gathered = new Dictionary<string, int>(), StructuresPlaced = 0 }]
        });

        await client.PostAsJsonAsync($"/api/v1/sessions/{olderSessionId}/summary", new SessionSummary
        {
            Outcome = "HOST_ENDED",
            EndedAt = t0.AddMinutes(5),
            ObjectivesCompleted = 0,
            Structures = [],
            TotalGathered = new Dictionary<string, int>(),
            Contributions = [new Contribution { PlayerId = hostId, Gathered = new Dictionary<string, int>(), StructuresPlaced = 0 }]
        });

        // 1. Default list: newest first
        var listResp = await client.GetAsync("/api/v1/sessions");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var listRaw = await listResp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(listRaw, "SessionRecordList");

        var list = JsonSerializer.Deserialize<SessionRecordList>(listRaw);
        Assert.NotNull(list);
        Assert.Equal([newestSessionId, newerSessionId, olderSessionId], list.Items.Select(i => i.SessionId).ToArray());

        // 2. Filter by status=COMPLETED
        var completedResp = await client.GetAsync("/api/v1/sessions?status=COMPLETED");
        Assert.Equal(HttpStatusCode.OK, completedResp.StatusCode);
        var completedRaw = await completedResp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(completedRaw, "SessionRecordList");
        var completedList = JsonSerializer.Deserialize<SessionRecordList>(completedRaw);
        Assert.NotNull(completedList);
        var singleCompleted = Assert.Single(completedList.Items);
        Assert.Equal(newerSessionId, singleCompleted.SessionId);

        // 3. Limit=2
        var limitedResp = await client.GetAsync("/api/v1/sessions?limit=2");
        Assert.Equal(HttpStatusCode.OK, limitedResp.StatusCode);
        var limitedRaw = await limitedResp.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(limitedRaw, "SessionRecordList");
        var limitedList = JsonSerializer.Deserialize<SessionRecordList>(limitedRaw);
        Assert.NotNull(limitedList);
        Assert.Equal([newestSessionId, newerSessionId], limitedList.Items.Select(i => i.SessionId).ToArray());
    }

    [Theory]
    [InlineData("/api/v1/sessions?status=INVALID", "status")]
    [InlineData("/api/v1/sessions?status=active", "status")]
    [InlineData("/api/v1/sessions?status=", "status")]
    [InlineData("/api/v1/sessions?limit=0", "limit")]
    [InlineData("/api/v1/sessions?limit=101", "limit")]
    public async Task ListSessions_InvalidQueryParameters_Returns400ValidationFailed(string url, string expectedField)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = JsonSerializer.Deserialize<ApiProblemDetails>(rawProblem);
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Field == expectedField);
    }

    [Fact]
    public async Task UnexpectedException_Returns500InternalError_WithProblemJson()
    {
        using var throwingFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<ISessionRepository>();
                services.AddSingleton<ISessionRepository, ThrowingSessionRepository>();
            });
        });
        using var client = throwingFactory.CreateClient();

        var response = await client.GetAsync("/api/v1/sessions");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = JsonSerializer.Deserialize<ApiProblemDetails>(rawProblem);
        Assert.NotNull(problem);
        Assert.Equal(500, problem.Status);
        Assert.Equal("INTERNAL_ERROR", problem.Code);
    }

    [Fact]
    public async Task CreateSession_UnsupportedMediaType_Returns415_WithProblemCode()
    {
        using var content = new StringContent("plain text body", Encoding.UTF8, "text/plain");
        var response = await _client.PostAsync("/api/v1/sessions", content);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(415, problem.Status);
        Assert.Equal("UNSUPPORTED_MEDIA_TYPE", problem.Code);
    }

    [Fact]
    public async Task UnknownRoute_Returns404_WithProblemCode()
    {
        var response = await _client.GetAsync("/api/v1/unknown-endpoint");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(404, problem.Status);
        Assert.Equal("NOT_FOUND", problem.Code);
    }

    [Fact]
    public async Task UnsupportedMethod_Returns405_WithProblemCode()
    {
        var response = await _client.DeleteAsync("/api/v1/sessions");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

        var problem = await response.Content.ReadFromJsonAsync<ApiProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(405, problem.Status);
        Assert.Equal("METHOD_NOT_ALLOWED", problem.Code);
    }

    [Fact]
    public async Task GetSession_NotFound_Returns404_WithProblemJson()
    {
        var unknownSessionId = Guid.NewGuid().ToString().ToLowerInvariant();

        var response = await _client.GetAsync($"/api/v1/sessions/{unknownSessionId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType.MediaType);

        var rawProblem = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(rawProblem, "Problem");

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

    private sealed class ThrowingSessionRepository : ISessionRepository
    {
        public bool TryCreateSession(SessionRecord session) => throw new InvalidOperationException("Simulated storage failure.");
        public SessionRecord? GetSession(string sessionId) => throw new InvalidOperationException("Simulated storage failure.");
        public bool TryUpdateSession(SessionRecord current, SessionRecord updated) => throw new InvalidOperationException("Simulated storage failure.");
        public IReadOnlyList<SessionRecord> ListSessions(string? status, int limit) => throw new InvalidOperationException("Simulated storage failure.");
    }
}
