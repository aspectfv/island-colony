# Extending the contracts

How to add or change scope without stalling anyone. Every contract change goes through a PR that
the project lead approves. The question is only how much has to change alongside it.

## Kinds of change

| Kind | Examples | Version bump | Who must change code in the same PR |
|---|---|---|---|
| Balancing | Costs, yields, ranges, cooldowns, objective targets | None (world service build) | World service only |
| Content | New resource, node type, structure, objective of an existing kind | None (world service build) | World service; client art is optional thanks to fallbacks |
| Additive contract | New optional field, new message type, new endpoint, new objective kind, new error code | Minor (`1.1.0`) | Only the producer. Consumers pick it up when they choose |
| Breaking contract | Remove or rename a field, change a meaning or unit, make an optional field required, tighten a rule | Major (`2.0.0`) plus the matching `/api/v2`, `protocolVersion` or `configVersion` | Every producer and consumer of that contract |
| Clarification | Wording, examples, typos, with no change in behavior | Patch (`1.0.1`) | None |

Prefer additive. A breaking change needs a reason no additive change can meet.

## Why additive changes do not block anyone

- Consumers ignore unknown fields, message types and enum values (`conventions.md`), so an older
  service keeps working against a newer one.
- Content is data. Totals are maps keyed by resource type, structures and objectives are catalogs,
  and the HUD reads names from `rules`, so new content needs no schema change.
- Every service is developed against the examples, not against another service. Updating an
  example updates every mock.

## Recipes

### Add a resource (for example food from berry bushes)

1. World service: add `{ "resourceType": "food", "displayName": "Food" }` to `rules.resources`,
   a `berry-bush` entry to `rules.nodeTypes`, and place `berry-bush-*` nodes.
2. Regenerate `examples/world/WorldConfig.json` if the fixture should show it.
3. Client: optional. Unknown node types render with a placeholder mesh until real art lands. The
   HUD picks up the new resource from `rules.resources`.

No schema change. No host change: gathering is generic over node types.

### Add a structure or objective step

1. World service: add the structure to `rules.structures` and a `BUILD` objective to
   `rules.objectives` at the right position.
2. Client: optional model for the new `structureType`; a placeholder box is the fallback.

No schema change.

### Add an objective kind (for example `DELIVER`)

1. Schema: add a `DeliverObjective` branch to `ObjectiveDef` in `world.schema.json`, add
   `DELIVER` to the excluded kinds in `OtherObjective`, and add an example. Minor bump.
2. Host gameplay logic: implement completion for the new kind.
3. World service: start using it.

Clients that are not updated still load the config, because `OtherObjective` accepts any kind
they do not know, and show the objective's `description`. Sequence the PRs host first,
world service second, so the world service never sends a kind the host cannot complete.

### Add a gameplay action (for example `REPAIR_BUILDING`)

1. Schema: add a request message, a result event with `seq`, and examples. Add any new rejection
   codes to `gameplay-protocol.md`. Minor bump.
2. Host logic validates and applies it; clients add the UI.

Older clients ignore the new event type.

### Add a REST endpoint or response field

1. OpenAPI and schema: add the endpoint or optional field, with an example. Minor bump.
2. The owning service implements it. Clients adopt it when ready.

### Add a signaling message

Same as a gameplay action. The signaling server replies `UNKNOWN_TYPE` to client messages it does
not know, so ship the server side before clients send the new message.

## Making a breaking change

1. Open an issue describing the change, the reason, and the affected owners. Discuss it with them.
2. The project lead decides.
3. One PR updates the schema, the examples, the docs, `VERSION`, `CHANGELOG.md`, and the version
   marker (`/api/v2`, `protocolVersion`, or `configVersion`).
4. Each affected service follows with its own PR. Where practical a REST service serves `v1` and
   `v2` side by side until every client has moved.

## Checklist for every contract PR

- [ ] Schema, OpenAPI, and docs updated together
- [ ] An example for every new definition or message type
- [ ] `npm test` and `npm run lint` pass in `contracts/`
- [ ] `VERSION` bumped and `CHANGELOG.md` entry added (skip for balancing or content changes, which do not touch `contracts/`)
- [ ] Affected owners tagged in the PR
