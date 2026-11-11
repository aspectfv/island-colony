using MetadataService.Models;

namespace MetadataService.Storage;

public interface ISessionRepository
{
    bool TryCreateSession(SessionRecord session);
    SessionRecord? GetSession(string sessionId);
    bool TryUpdateSession(SessionRecord current, SessionRecord updated);
    IReadOnlyList<SessionRecord> ListSessions(string? status, int limit);
}
