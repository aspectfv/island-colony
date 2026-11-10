using System.Collections.Concurrent;
using MetadataService.Models;

namespace MetadataService.Storage;

public class InMemorySessionRepository : ISessionRepository
{
    private readonly ConcurrentDictionary<string, SessionRecord> _sessions = new(StringComparer.OrdinalIgnoreCase);

    public bool TryCreateSession(SessionRecord session)
    {
        return _sessions.TryAdd(session.SessionId, session);
    }

    public SessionRecord? GetSession(string sessionId)
    {
        _sessions.TryGetValue(sessionId, out var session);
        return session;
    }
}
