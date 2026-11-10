using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record SessionRecord
{
    [JsonPropertyName("sessionId")]
    public required string SessionId { get; init; }

    [JsonPropertyName("lobbyCode")]
    public required string LobbyCode { get; init; }

    [JsonPropertyName("hostPlayerId")]
    public required string HostPlayerId { get; init; }

    [JsonPropertyName("worldSeed")]
    public required int WorldSeed { get; init; }

    [JsonPropertyName("startedAt")]
    public required DateTimeOffset StartedAt { get; init; }

    [JsonPropertyName("participants")]
    public required IReadOnlyList<Participant> Participants { get; init; }

    [JsonPropertyName("status")]
    public required string Status { get; init; }

    [JsonPropertyName("durationSeconds")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? DurationSeconds { get; init; }

    [JsonPropertyName("summary")]
    public object? Summary { get; init; }
}
