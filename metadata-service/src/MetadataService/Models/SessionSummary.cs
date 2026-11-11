using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace MetadataService.Models;

public partial record SessionSummary : IValidatableObject
{
    [GeneratedRegex(@"^[a-z][a-z0-9]*(-[a-z0-9]+)*$")]
    private static partial Regex ContentIdRegex();

    [Required]
    [RegularExpression(@"^[A-Z][A-Z0-9_]*$", ErrorMessage = "outcome must be UPPER_SNAKE_CASE.")]
    [JsonPropertyName("outcome")]
    public required string Outcome { get; init; }

    [JsonPropertyName("endedAt")]
    public required DateTimeOffset EndedAt { get; init; }

    [Range(0, int.MaxValue, ErrorMessage = "objectivesCompleted must be non-negative.")]
    [JsonPropertyName("objectivesCompleted")]
    public required int ObjectivesCompleted { get; init; }

    [Required]
    [JsonPropertyName("structures")]
    public required List<PlacedStructureSummary> Structures { get; init; }

    [Required]
    [JsonPropertyName("totalGathered")]
    public required Dictionary<string, int> TotalGathered { get; init; }

    [Required]
    [JsonPropertyName("contributions")]
    public required List<Contribution> Contributions { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        bool hasNullItem = false;

        for (int i = 0; i < Structures.Count; i++)
        {
            if (Structures[i] is null)
            {
                yield return new ValidationResult("Structure entry must not be null.", [$"structures[{i}]"]);
                hasNullItem = true;
            }
        }

        foreach (var (resourceKey, amount) in TotalGathered)
        {
            if (!IsValidContentId(resourceKey))
            {
                yield return new ValidationResult($"Resource key '{resourceKey}' must be a valid lowercase kebab-case ContentId.", [$"totalGathered.{resourceKey}"]);
            }

            if (amount < 0)
            {
                yield return new ValidationResult($"Resource amount for '{resourceKey}' must be non-negative.", [$"totalGathered.{resourceKey}"]);
            }
        }

        var contributionPlayers = new HashSet<string>();
        for (int i = 0; i < Contributions.Count; i++)
        {
            var contribution = Contributions[i];
            if (contribution is null)
            {
                yield return new ValidationResult("Contribution entry must not be null.", [$"contributions[{i}]"]);
                hasNullItem = true;
                continue;
            }

            if (!contributionPlayers.Add(contribution.PlayerId))
            {
                yield return new ValidationResult($"Contribution playerId '{contribution.PlayerId}' is duplicated.", [$"contributions[{i}].playerId"]);
            }

            if (contribution.Gathered is null)
            {
                hasNullItem = true;
                continue;
            }

            foreach (var (resourceKey, amount) in contribution.Gathered)
            {
                if (!IsValidContentId(resourceKey))
                {
                    yield return new ValidationResult($"Resource key '{resourceKey}' must be a valid lowercase kebab-case ContentId.", [$"contributions[{i}].gathered.{resourceKey}"]);
                }

                if (amount < 0)
                {
                    yield return new ValidationResult($"Resource amount for '{resourceKey}' must be non-negative.", [$"contributions[{i}].gathered.{resourceKey}"]);
                }
            }
        }

        if (hasNullItem)
        {
            yield break;
        }

        long totalStructuresPlaced = Contributions.Sum(c => (long)c.StructuresPlaced);
        if (totalStructuresPlaced != Structures.Count)
        {
            yield return new ValidationResult(
                $"Sum of contributions structuresPlaced ({totalStructuresPlaced}) must equal structures count ({Structures.Count}).",
                [nameof(Structures)]);
        }

        var summedGathered = new Dictionary<string, long>();
        foreach (var contribution in Contributions)
        {
            foreach (var (resourceKey, amount) in contribution.Gathered)
            {
                summedGathered[resourceKey] = summedGathered.GetValueOrDefault(resourceKey) + amount;
            }
        }

        var allResourceKeys = new HashSet<string>(summedGathered.Keys);
        allResourceKeys.UnionWith(TotalGathered.Keys);

        foreach (var resourceKey in allResourceKeys)
        {
            long contributedAmount = summedGathered.GetValueOrDefault(resourceKey);
            long totalAmount = TotalGathered.GetValueOrDefault(resourceKey);
            if (contributedAmount != totalAmount)
            {
                yield return new ValidationResult(
                    $"Sum of contributions gathered for '{resourceKey}' ({contributedAmount}) must equal totalGathered ({totalAmount}).",
                    [$"totalGathered.{resourceKey}"]);
            }
        }
    }

    public List<ValidationError> ValidateAgainstSession(SessionRecord session)
    {
        var errors = new List<ValidationError>();

        if (EndedAt < session.StartedAt)
        {
            errors.Add(new ValidationError("endedAt", "endedAt must not be earlier than startedAt."));
        }

        var participantIds = new HashSet<string>(session.Participants.Select(p => p.PlayerId));

        for (int i = 0; i < Structures.Count; i++)
        {
            var placedBy = Structures[i].PlacedBy;
            if (!participantIds.Contains(placedBy))
            {
                errors.Add(new ValidationError($"structures[{i}].placedBy", $"Player '{placedBy}' is not a participant in this session."));
            }
        }

        for (int i = 0; i < Contributions.Count; i++)
        {
            var playerId = Contributions[i].PlayerId;
            if (!participantIds.Contains(playerId))
            {
                errors.Add(new ValidationError($"contributions[{i}].playerId", $"Player '{playerId}' is not a participant in this session."));
            }
        }

        return errors;
    }

    private static bool IsValidContentId(string value)
    {
        return !string.IsNullOrEmpty(value) && value.Length <= 48 && ContentIdRegex().IsMatch(value);
    }
}

