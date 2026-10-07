# Conventions

Rules that apply to every contract. Each service doc assumes these.

## JSON

| Element | Convention | Example |
|---|---|---|
| Field names | camelCase | `hostPlayerId` |
| Message types, statuses, error codes | UPPER_SNAKE_CASE | `RESOURCE_GATHERED`, `LOBBY_FULL` |
| Content IDs (resource, node, structure, objective types) | lowercase kebab-case | `storage-hut` |
| Entity IDs (resource nodes, structures, build zones) | `<kind>-<number>` | `tree-0042`, `structure-3` |
| Encoding | UTF-8 JSON, no comments, no trailing commas | |

## Identifiers

| ID | Format | Assigned by | Scope |
|---|---|---|---|
| `playerId` | UUID v4, lowercase | Lobby service on create or join | One lobby |
| `playerToken` | Opaque string, at least 128 random bits | Lobby service on create or join | Secret to its player |
| `lobbyCode` | 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` | Lobby service | Unique among live lobbies |
| `sessionId` | UUID v4, lowercase | Lobby service on start | Global |
| `resourceId` | `<nodeType>-<4 digits>` | World service | One world config |
| `zoneId` | `zone-<n>` | World service | One world config |
| `structureId` | `structure-<n>`, n from 1 | Host client | One session |
| `requestId` | Any string up to 64 chars | Requesting client | One requester, one session |

Lobby codes are case-insensitive on input and always returned uppercase.

## Coordinates and units

The world uses the Three.js defaults so the client never converts.

| Property | Convention |
|---|---|
| Units | Meters |
| Axes | Right-handed, +Y up, ground is the XZ plane |
| Origin | Center of the island, at sea level |
| Ground positions (`Vec2`) | `{x, z}`. Y comes from the terrain, see `world-config.md` |
| World positions (`Vec3`) | `{x, y, z}` |
| Yaw | Radians about +Y, in [-π, π]. 0 faces -Z. Positive turns toward -X |
| Forward vector | `(-sin(yaw), 0, -cos(yaw))`, the same as `object.rotation.y = yaw` in Three.js |
| Distances in rules | Ground distance on XZ, ignoring Y |

Send positions with at most 2 decimals and yaw with at most 4.

## Time

| Kind | Format |
|---|---|
| Points in time | ISO 8601 UTC with `Z`, for example `2026-10-07T12:02:00Z` |
| Durations | Integer with the unit in the name: `cooldownMs`, `durationSeconds` |

Timestamps are for records and display. Gameplay logic never compares clocks across machines.

## Reading and writing payloads

These rules are what let one service change without breaking another.

1. **Ignore unknown fields.** A consumer must accept a payload with fields it does not know. Do
   not deserialize with "fail on unknown properties" turned on in production code.
2. **Ignore unknown message types.** Log them at debug level and continue.
3. **Treat open sets as open.** Error codes, end reasons, animation names, and content IDs can
   gain values. Handle an unknown value with a generic fallback, never a crash.
4. **Send only what the contract declares.** Producers emit exactly the fields in the schema for
   the contract version they implement. The schemas use `additionalProperties: false` to keep the
   examples honest, not to tell consumers to reject extras.
5. **Optional means optional.** A consumer must work when an optional field is missing.

## REST

| Topic | Rule |
|---|---|
| Base path | `/api/v1`. The major version is in the path |
| Success bodies | `application/json` |
| Errors | `application/problem+json` using `Problem` from `schemas/common.schema.json` (RFC 9457 plus a required `code`) |
| Validation failures | Status 400, code `VALIDATION_FAILED`, field details in `errors`. Map framework defaults to this, for example FastAPI's 422 and ASP.NET's `ValidationProblemDetails` |
| Unexpected failures | Status 500, code `INTERNAL_ERROR` |
| Health | `GET /health` returns `Health` on every service, outside `/api/v1` |
| Auth | Only the lobby service checks anything: the `X-Player-Token` header. Other services trust callers in the MVP |

Every error a client may need to react to has a stable `code`. Clients branch on `code`, never on
`title` or `detail`. `detail` is safe to show to the player.

## Local development

| Service | Port | Transport |
|---|---|---|
| Client (Vite) | 5173 | HTTP |
| Lobby service | 8081 | HTTP |
| Signaling service | 8082 | WebSocket at `/ws` |
| World service | 8083 | HTTP |
| Metadata service | 8084 | HTTP |

Every HTTP service allows CORS from the origins in its `ALLOWED_ORIGINS` environment variable,
comma separated, defaulting to `http://localhost:5173`. The signaling service checks the
WebSocket `Origin` header against the same variable.

## Versions

| Version | Where | Bumped when |
|---|---|---|
| Contracts version | `contracts/VERSION`, semver | Every merged contract change. See `extending.md` |
| REST major | `/api/v1` path | Breaking REST change |
| Gameplay protocol | `protocolVersion` in `SESSION_STARTED` and `CLIENT_READY` | Breaking gameplay message change |
| World config format | `configVersion` in `WorldConfig` | Breaking world config change |

Services report the contracts version they implement in `Health.contractsVersion`.
