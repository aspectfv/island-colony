using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record PlacedStructureSummary
{
    [Required]
    [MaxLength(48, ErrorMessage = "structureType must be at most 48 characters.")]
    [RegularExpression(@"^[a-z][a-z0-9]*(-[a-z0-9]+)*$", ErrorMessage = "structureType must be lowercase kebab-case.")]
    [JsonPropertyName("structureType")]
    public required string StructureType { get; init; }

    [Required]
    [RegularExpression(@"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", ErrorMessage = "placedBy must be a lowercase UUID v4.")]
    [JsonPropertyName("placedBy")]
    public required string PlacedBy { get; init; }

    [JsonPropertyName("placedAt")]
    public required DateTimeOffset PlacedAt { get; init; }
}

