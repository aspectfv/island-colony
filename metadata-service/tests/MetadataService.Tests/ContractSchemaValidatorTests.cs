using Xunit.Sdk;

namespace MetadataService.Tests;

// Guards against the validator passing vacuously (for example, a $ref that resolves to nothing).
public class ContractSchemaValidatorTests
{
    public static TheoryData<string> MetadataExampleFiles()
    {
        var data = new TheoryData<string>();
        var examplesDir = Path.Combine(ContractSchemaValidator.FindContractsDirectory(), "examples", "metadata");
        foreach (var file in Directory.GetFiles(examplesDir, "*.json").OrderBy(f => f, StringComparer.Ordinal))
        {
            data.Add(Path.GetFileName(file));
        }
        return data;
    }

    [Theory]
    [MemberData(nameof(MetadataExampleFiles))]
    public void ContractExamples_PassValidation(string fileName)
    {
        var path = Path.Combine(ContractSchemaValidator.FindContractsDirectory(), "examples", "metadata", fileName);
        var defName = fileName.Split('.')[0];

        ContractSchemaValidator.AssertMatchesMetadataDef(File.ReadAllText(path), defName);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"sessionId":"not-a-uuid","lobbyCode":"K7QX2M","hostPlayerId":"3f6c2a1e-8b4d-4c2e-9a71-0d5e2b7c4f10","worldSeed":1,"startedAt":"2026-10-07T12:02:00Z","participants":[],"status":"ACTIVE","summary":null}""")]
    [InlineData("""{"sessionId":"6a2e9c4b-1f7d-4b83-a5e0-8c3d7f2b9e16","lobbyCode":"K7QX2M","hostPlayerId":"3f6c2a1e-8b4d-4c2e-9a71-0d5e2b7c4f10","worldSeed":1,"startedAt":"2026-10-07T12:02:00Z","participants":[],"status":"PAUSED","summary":null}""")]
    public void InvalidSessionRecord_FailsValidation(string payload)
    {
        Assert.Throws<FailException>(() => ContractSchemaValidator.AssertMatchesMetadataDef(payload, "SessionRecord"));
    }

    [Theory]
    [InlineData("""{"status":400,"title":"Bad","code":"VALIDATION_FAILED","traceId":"abc"}""")]
    [InlineData("""{"status":400,"title":"Bad","code":"validation_failed"}""")]
    [InlineData("""{"status":400,"title":"Bad"}""")]
    public void InvalidProblem_FailsValidation(string payload)
    {
        Assert.Throws<FailException>(() => ContractSchemaValidator.AssertMatchesCommonDef(payload, "Problem"));
    }
}

