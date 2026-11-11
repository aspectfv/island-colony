using System.Collections.Concurrent;
using MetadataService.Models;

namespace MetadataService.Storage;

public class InMemorySessionRepository : ISessionRepository
{
    private readonly ConcurrentDictionary<string, SessionRecord> _sessions = new();

    public bool TryCreateSession(SessionRecord session)
    {
        return _sessions.TryAdd(session.SessionId, session);
    }

    public SessionRecord? GetSession(string sessionId)
    {
        _sessions.TryGetValue(sessionId, out var session);
        return session;
    }

    public bool TryUpdateSession(SessionRecord current, SessionRecord updated)
    {
        return _sessions.TryUpdate(current.SessionId, updated, current);
    }

    public IReadOnlyList<SessionRecord> ListSessions(string? status, int limit)
    {
        IEnumerable<SessionRecord> query = _sessions.Values;

        if (status is not null)
        {
            query = query.Where(s => s.Status == status);
        }

        return query
            .OrderByDescending(s => s.StartedAt)
            .ThenBy(s => s.SessionId, StringComparer.Ordinal)
            .Take(limit)
            .ToList();
    }
}
