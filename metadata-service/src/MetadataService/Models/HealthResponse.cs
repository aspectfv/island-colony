using System.Text.Json.Serialization;

namespace MetadataService.Models;

public record HealthResponse
{
    [JsonPropertyName("status")]
    public string Status { get; init; } = "ok";

    [JsonPropertyName("service")]
    public string Service { get; init; } = "metadata-service";

    [JsonPropertyName("contractsVersion")]
    public string ContractsVersion { get; init; } = "1.0.1";
}
