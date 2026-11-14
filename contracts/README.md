# Contracts

The formats every part of Island Colony agrees on. Each service is built and tested against these
files, not against another service, which is what lets everyone work at the same time.

Current version: see `VERSION`. History: `CHANGELOG.md`.

## Where to start

| If you work on | Read |
|---|---|
| Anything | `docs/conventions.md`, `docs/session-flow.md`, `docs/invariants.md` |
| Client rendering | `docs/world-config.md` |
| Client gameplay or host logic | `docs/gameplay-protocol.md`, `docs/world-config.md` |
| Client networking | `docs/signaling-protocol.md`, `docs/gameplay-protocol.md` |
| Client UI | `docs/session-flow.md`, `docs/lobby-service.md`, `docs/metadata-service.md` |
| Lobby service | `docs/lobby-service.md`, `openapi/lobby.openapi.yaml` |
| Signaling service | `docs/signaling-protocol.md` |
| World service | `docs/world-config.md`, `openapi/world.openapi.yaml` |
| Metadata service | `docs/metadata-service.md`, `openapi/metadata.openapi.yaml` |
| Changing any of this | `docs/extending.md` |

## Layout

| Path | Holds |
|---|---|
| `schemas/` | JSON Schema (draft 2020-12) for every payload: `common`, `world`, `lobby`, `metadata`, `signaling`, `gameplay` |
| `openapi/` | OpenAPI 3.1 for the three REST services. Bodies reference `schemas/` |
| `examples/<domain>/` | One valid example per definition, named `<Definition>[.<variant>].json` |
| `docs/` | Flows and rules that schemas cannot express |
| `scripts/validate.mjs` | Checks every example against its schema and checks world and summary invariants |
| `scripts/sample-height.mjs` | Reference terrain sampler. Import it in tests to check your own sampler |
| `scripts/trace.mjs` | Checks that rule IDs cited in tests exist, and lists rules no test covers yet |

## Using the contracts in a service

The schemas and OpenAPI files are the source. Generate or hand-write types from them in whatever
way suits your stack, for example `json-schema-to-typescript`, `datamodel-code-generator`
(Pydantic), `openapi-generator` (Java, C#), or hand-written Go structs. Keep generated code in your
service, not here.

The examples double as mock data. A client adapter can return `examples/lobby/Lobby.waiting.json`
before the lobby service exists, and a service test can check its output against the matching
example's shape. `examples/world/WorldConfig.json` is the development island.

## Commands

Run from `contracts/`. Needs Node 22 or later.

| Task | Command |
|---|---|
| Install | `npm install` |
| Validate examples and world invariants | `npm test` |
| Lint the OpenAPI files | `npm run lint` |
| Check rule IDs in tests | `npm run trace` |

## Rule IDs

Every rule table in `docs/` has a `Rule ID` column, and `docs/invariants.md` lists the rules that
cross every service. A test that checks a rule starts its name with the rule's ID, for example
`it("GP-GATHER-04: rejects a depleted node", ...)`. `docs/invariants.md` shows the form for each
stack.

To add a rule, add a row with the next free ID in its table, then tag the test that checks it.
CI fails when a test cites an ID that no table defines. Rules without a test are listed as not
built and do not fail CI yet.

## Rules

Contracts change only through a PR the project lead approves. `docs/extending.md` explains which
changes are additive and which are breaking, and has recipes for common additions.
