# Contracts

The formats every part of Island Colony agrees on. Each service is built and tested against these
files, not against another service, which is what lets everyone work at the same time.

Current version: see `VERSION`. History: `CHANGELOG.md`.

## Where to start

| If you work on | Read |
|---|---|
| Anything | `docs/conventions.md`, `docs/session-flow.md` |
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
| `scripts/validate.mjs` | Checks every example against its schema, checks world config invariants, and holds the reference terrain sampler |

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

## Rules

Contracts change only through a PR the project lead approves. `docs/extending.md` explains which
changes are additive and which are breaking, and has recipes for common additions.
