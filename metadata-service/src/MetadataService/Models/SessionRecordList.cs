using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record SessionRecordList
{
    [JsonPropertyName("items")]
    public required IReadOnlyList<SessionRecord> Items { get; init; }
}

