using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MetadataService.Models;
using MetadataService.Storage;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MetadataService.Tests;

// Rule coverage for listing defaults, filters, ordering ties and duration edges.
public class SessionRulesCoverageTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SessionRulesCoverageTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ListSessions_WithoutLimit_ReturnsDefault20NewestFirst()
    {
        using var client = CreateIsolatedClient();
        var t0 = new DateTimeOffset(2026, 10, 7, 0, 0, 0, TimeSpan.Zero);

        for (int i = 0; i < 25; i++)
        {
            await CreateSessionAsync(client, NewId(), t0.AddMinutes(i));
        }

        var list = await GetListAsync(client, "/api/v1/sessions");

        Assert.Equal(20, list.Items.Count);
        Assert.Equal(t0.AddMinutes(24), list.Items[0].StartedAt);
        Assert.Equal(t0.AddMinutes(5), list.Items[^1].StartedAt);
    }

    [Fact]
    public async Task ListSessions_StatusFilter_ReturnsOnlyActiveOrEnded()
    {
        using var client = CreateIsolatedClient();
        var t0 = new DateTimeOffset(2026, 10, 7, 10, 0, 0, TimeSpan.Zero);
        var activeId = NewId();
        var completedId = NewId();
        var endedId = NewId();

        var activeHost = await CreateSessionAsync(client, activeId, t0);
        var completedHost = await CreateSessionAsync(client, completedId, t0.AddMinutes(1));
        var endedHost = await CreateSessionAsync(client, endedId, t0.AddMinutes(2));

        await PostEmptySummaryAsync(client, completedId, completedHost, "COMPLETED", t0.AddMinutes(30));
        await PostEmptySummaryAsync(client, endedId, endedHost, "HOST_ENDED", t0.AddMinutes(30));

        var active = await GetListAsync(client, "/api/v1/sessions?status=ACTIVE");
        var activeRecord = Assert.Single(active.Items);
        Assert.Equal(activeId, activeRecord.SessionId);
        Assert.Equal(SessionRecordStatus.Active, activeRecord.Status);
        Assert.Null(activeRecord.Summary);

        var ended = await GetListAsync(client, "/api/v1/sessions?status=ENDED");
        var endedRecord = Assert.Single(ended.Items);
        Assert.Equal(endedId, endedRecord.SessionId);
        Assert.Equal(SessionRecordStatus.Ended, endedRecord.Status);
    }

    [Fact]
    public async Task ListSessions_EqualStartedAt_OrdersBySessionIdAscending()
    {
        using var client = CreateIsolatedClient();
        var startedAt = new DateTimeOffset(2026, 10, 7, 10, 0, 0, TimeSpan.Zero);
        var firstId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
        var secondId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

        // Created in reverse order so insertion order cannot explain the result.
        await CreateSessionAsync(client, secondId, startedAt);
        await CreateSessionAsync(client, firstId, startedAt);

        var list = await GetListAsync(client, "/api/v1/sessions");

        Assert.Equal([firstId, secondId], list.Items.Select(i => i.SessionId).ToArray());
    }

    [Fact]
    public async Task ListSessions_NonIntegerLimit_Returns400ValidationFailed()
    {
        using var client = CreateIsolatedClient();

        var response = await client.GetAsync("/api/v1/sessions?limit=abc");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var raw = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesCommonDef(raw, "Problem");

        var problem = JsonSerializer.Deserialize<ApiProblemDetails>(raw);
        Assert.NotNull(problem);
        Assert.Equal("VALIDATION_FAILED", problem.Code);
        Assert.NotNull(problem.Errors);
        Assert.Contains(problem.Errors, e => e.Field == "limit");
    }

    [Fact]
    public async Task PostSummary_EndedAtEqualsStartedAt_SetsZeroDuration()
    {
        using var client = CreateIsolatedClient();
        var sessionId = NewId();
        var startedAt = new DateTimeOffset(2026, 10, 7, 12, 0, 0, TimeSpan.Zero);
        var hostId = await CreateSessionAsync(client, sessionId, startedAt);

        var record = await PostEmptySummaryAsync(client, sessionId, hostId, "COMPLETED", startedAt);

        Assert.Equal(0, record.DurationSeconds);
        Assert.Equal(SessionRecordStatus.Completed, record.Status);
    }

    [Fact]
    public async Task PostSummary_FractionalSeconds_TruncatesToWholeSeconds()
    {
        using var client = CreateIsolatedClient();
        var sessionId = NewId();
        var startedAt = new DateTimeOffset(2026, 10, 7, 12, 0, 0, TimeSpan.Zero);
        var hostId = await CreateSessionAsync(client, sessionId, startedAt);

        var record = await PostEmptySummaryAsync(client, sessionId, hostId, "COMPLETED", startedAt.AddMilliseconds(10_900));

        Assert.Equal(10, record.DurationSeconds);
    }

    private HttpClient CreateIsolatedClient()
    {
        var factory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<ISessionRepository>();
                services.AddSingleton<ISessionRepository, InMemorySessionRepository>();
            });
        });
        return factory.CreateClient();
    }

    private static string NewId() => Guid.NewGuid().ToString().ToLowerInvariant();

    private static async Task<string> CreateSessionAsync(HttpClient client, string sessionId, DateTimeOffset startedAt)
    {
        var hostId = NewId();
        var response = await client.PostAsJsonAsync("/api/v1/sessions", new CreateSessionRecordRequest
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = hostId,
            WorldSeed = 1,
            StartedAt = startedAt,
            Participants = [new Participant { PlayerId = hostId, DisplayName = "Host", Slot = 0 }]
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return hostId;
    }

    private static async Task<SessionRecord> PostEmptySummaryAsync(
        HttpClient client, string sessionId, string hostId, string outcome, DateTimeOffset endedAt)
    {
        var response = await client.PostAsJsonAsync($"/api/v1/sessions/{sessionId}/summary", new SessionSummary
        {
            Outcome = outcome,
            EndedAt = endedAt,
            ObjectivesCompleted = 0,
            Structures = [],
            TotalGathered = new Dictionary<string, int>(),
            Contributions = [new Contribution { PlayerId = hostId, Gathered = new Dictionary<string, int>(), StructuresPlaced = 0 }]
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var raw = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(raw, "SessionRecord");

        var record = JsonSerializer.Deserialize<SessionRecord>(raw);
        Assert.NotNull(record);
        return record;
    }

    private static async Task<SessionRecordList> GetListAsync(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var raw = await response.Content.ReadAsStringAsync();
        ContractSchemaValidator.AssertMatchesMetadataDef(raw, "SessionRecordList");

        var list = JsonSerializer.Deserialize<SessionRecordList>(raw);
        Assert.NotNull(list);
        return list;
    }
}

