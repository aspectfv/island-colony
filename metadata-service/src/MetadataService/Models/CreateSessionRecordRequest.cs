using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record CreateSessionRecordRequest : IValidatableObject
{
    [Required]
    [RegularExpression(@"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", ErrorMessage = "sessionId must be a lowercase UUID v4.")]
    [JsonPropertyName("sessionId")]
    public required string SessionId { get; init; }

    [Required]
    [RegularExpression(@"^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$", ErrorMessage = "lobbyCode must be 6 uppercase alphanumeric characters excluding ambiguous characters.")]
    [JsonPropertyName("lobbyCode")]
    public required string LobbyCode { get; init; }

    [Required]
    [RegularExpression(@"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", ErrorMessage = "hostPlayerId must be a lowercase UUID v4.")]
    [JsonPropertyName("hostPlayerId")]
    public required string HostPlayerId { get; init; }

    [Required]
    [Range(0, 2147483647, ErrorMessage = "worldSeed must be between 0 and 2147483647.")]
    [JsonPropertyName("worldSeed")]
    public required int WorldSeed { get; init; }

    [Required]
    [JsonPropertyName("startedAt")]
    public required DateTimeOffset StartedAt { get; init; }

    [Required]
    [MinLength(1, ErrorMessage = "participants must contain at least 1 participant.")]
    [JsonPropertyName("participants")]
    public required List<Participant> Participants { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Participants == null || Participants.Count == 0)
        {
            yield return new ValidationResult("participants must contain at least 1 participant.", [nameof(Participants)]);
            yield break;
        }

        var playerIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var slots = new HashSet<int>();
        bool hostFound = false;

        for (int i = 0; i < Participants.Count; i++)
        {
            var p = Participants[i];
            if (p == null) continue;

            if (!playerIds.Add(p.PlayerId))
            {
                yield return new ValidationResult($"Participant playerId '{p.PlayerId}' is duplicated.", [$"participants[{i}].playerId"]);
            }

            if (!slots.Add(p.Slot))
            {
                yield return new ValidationResult($"Participant slot '{p.Slot}' is duplicated.", [$"participants[{i}].slot"]);
            }

            if (string.Equals(p.PlayerId, HostPlayerId, StringComparison.OrdinalIgnoreCase))
            {
                hostFound = true;
            }
        }

        if (!hostFound)
        {
            yield return new ValidationResult($"hostPlayerId '{HostPlayerId}' must be included in participants.", [nameof(HostPlayerId)]);
        }
    }
}
