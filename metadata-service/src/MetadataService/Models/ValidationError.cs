using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record ValidationError(
    [property: JsonPropertyName("field")] string Field,
    [property: JsonPropertyName("message")] string Message);
