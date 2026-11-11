using System.Text.Json.Nodes;
using Json.Schema;

namespace MetadataService.Tests;

public static class ContractSchemaValidator
{
    private const string CommonSchemaId = "https://github.com/aspectfv/island-colony/contracts/schemas/common.schema.json";
    private const string MetadataSchemaId = "https://github.com/aspectfv/island-colony/contracts/schemas/metadata.schema.json";

    private static readonly Lazy<EvaluationOptions> SharedOptions = new(CreateOptions);

    public static void AssertMatchesMetadataDef(string jsonPayload, string defName)
    {
        AssertMatchesRef(jsonPayload, $"{MetadataSchemaId}#/$defs/{defName}");
    }

    public static void AssertMatchesCommonDef(string jsonPayload, string defName)
    {
        AssertMatchesRef(jsonPayload, $"{CommonSchemaId}#/$defs/{defName}");
    }

    private static void AssertMatchesRef(string jsonPayload, string schemaRef)
    {
        var refSchema = new JsonSchemaBuilder()
            .Schema(MetaSchemas.Draft202012Id)
            .Ref(schemaRef)
            .Build();

        var node = JsonNode.Parse(jsonPayload);
        var result = refSchema.Evaluate(node, SharedOptions.Value);

        if (!result.IsValid)
        {
            var details = result.Details
                ?.Where(d => !d.IsValid && d.Errors is not null)
                .SelectMany(d => d.Errors!.Select(kv => $"{d.InstanceLocation}: {kv.Key} - {kv.Value}"))
                ?? [];
            Assert.Fail($"Payload failed schema validation against '{schemaRef}':\n{string.Join("\n", details)}\nPayload:\n{jsonPayload}");
        }
    }

    public static string FindContractsDirectory()
    {
        return Path.GetDirectoryName(FindContractsSchemasDirectory())!;
    }

    private static EvaluationOptions CreateOptions()
    {
        var schemasDir = FindContractsSchemasDirectory();
        var commonSchema = JsonSchema.FromFile(Path.Combine(schemasDir, "common.schema.json"));
        var metadataSchema = JsonSchema.FromFile(Path.Combine(schemasDir, "metadata.schema.json"));

        var options = new EvaluationOptions
        {
            OutputFormat = OutputFormat.List,
            RequireFormatValidation = true
        };
        options.SchemaRegistry.Register(commonSchema);
        options.SchemaRegistry.Register(metadataSchema);
        return options;
    }

    private static string FindContractsSchemasDirectory()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "contracts", "schemas");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate 'contracts/schemas' directory from test base directory.");
    }
}
