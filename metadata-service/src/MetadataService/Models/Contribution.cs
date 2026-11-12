using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record Contribution
{
    [Required]
    [RegularExpression(@"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", ErrorMessage = "playerId must be a lowercase UUID v4.")]
    [JsonPropertyName("playerId")]
    public required string PlayerId { get; init; }

    [Required]
    [JsonPropertyName("gathered")]
    public required Dictionary<string, int> Gathered { get; init; }

    [Range(0, int.MaxValue, ErrorMessage = "structuresPlaced must be non-negative.")]
    [JsonPropertyName("structuresPlaced")]
    public required int StructuresPlaced { get; init; }
}

