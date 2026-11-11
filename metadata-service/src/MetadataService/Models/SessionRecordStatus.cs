namespace MetadataService.Models;

public static class SessionRecordStatus
{
    public const string Active = "ACTIVE";
    public const string Completed = "COMPLETED";
    public const string Ended = "ENDED";

    public static bool IsValid(string? status)
    {
        return status is Active or Completed or Ended;
    }
}
