using MetadataService.Models;
using MetadataService.Storage;
using Xunit;

namespace MetadataService.Tests;

public class InMemorySessionRepositoryTests
{
    private readonly InMemorySessionRepository _repository = new();

    [Fact]
    public void TryCreateSession_StoresSessionSuccessfully()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var record = new SessionRecord
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant(),
            WorldSeed = 42,
            StartedAt = DateTimeOffset.UtcNow,
            Participants = [],
            Status = SessionRecordStatus.Active,
            Summary = null
        };

        var created = _repository.TryCreateSession(record);
        var retrieved = _repository.GetSession(sessionId);

        Assert.True(created);
        Assert.NotNull(retrieved);
        Assert.Equal(sessionId, retrieved.SessionId);
    }

    [Fact]
    public void TryCreateSession_DuplicateSessionId_ReturnsFalse()
    {
        var sessionId = Guid.NewGuid().ToString().ToLowerInvariant();
        var record = new SessionRecord
        {
            SessionId = sessionId,
            LobbyCode = "ABCDEF",
            HostPlayerId = Guid.NewGuid().ToString().ToLowerInvariant(),
            WorldSeed = 42,
            StartedAt = DateTimeOffset.UtcNow,
            Participants = [],
            Status = SessionRecordStatus.Active,
            Summary = null
        };

        var first = _repository.TryCreateSession(record);
        var second = _repository.TryCreateSession(record);

        Assert.True(first);
        Assert.False(second);
    }

    [Fact]
    public void GetSession_NonExistent_ReturnsNull()
    {
        var result = _repository.GetSession(Guid.NewGuid().ToString());
        Assert.Null(result);
    }
}
