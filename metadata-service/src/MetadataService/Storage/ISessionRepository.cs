using MetadataService.Models;

namespace MetadataService.Storage;

public interface ISessionRepository
{
    bool TryCreateSession(SessionRecord session);
    SessionRecord? GetSession(string sessionId);
}
