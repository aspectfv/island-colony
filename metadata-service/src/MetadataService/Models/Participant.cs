using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record Participant
{
    [Required]
    [RegularExpression(@"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", ErrorMessage = "playerId must be a lowercase UUID v4.")]
    [JsonPropertyName("playerId")]
    public required string PlayerId { get; init; }

    [Required]
    [StringLength(16, MinimumLength = 1, ErrorMessage = "displayName must be between 1 and 16 characters.")]
    [JsonPropertyName("displayName")]
    public required string DisplayName { get; init; }

    [Required]
    [Range(0, 15, ErrorMessage = "slot must be between 0 and 15.")]
    [JsonPropertyName("slot")]
    public required int Slot { get; init; }
}
