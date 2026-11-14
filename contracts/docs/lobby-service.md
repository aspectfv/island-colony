# Lobby service

Rules behind `openapi/lobby.openapi.yaml`. Schemas: `schemas/lobby.schema.json`. Examples:
`examples/lobby/`.

## States

```mermaid
stateDiagram-v2
    [*] --> WAITING: create
    WAITING --> IN_PROGRESS: host starts
    WAITING --> ENDED: host leaves (HOST_LEFT)
    IN_PROGRESS --> ENDED: host ends (COMPLETED or HOST_ENDED)
    IN_PROGRESS --> ENDED: host heartbeat lost (HOST_DISCONNECTED)
    ENDED --> [*]: deleted after 1 h
```

`endReason` is present only in `ENDED`.

## Members

| Rule ID | Rule | Detail |
|---|---|---|
| LOBBY-MEMBER-01 | Capacity | `maxPlayers` is 5 |
| LOBBY-MEMBER-02 | Slots | The creator is host in slot 0. Joiners take the lowest free slot |
| LOBBY-MEMBER-03 | Names | Trimmed, 1 to 16 characters, unique per lobby ignoring case (`NAME_TAKEN`) |
| LOBBY-MEMBER-04 | Joining | Only while `WAITING` (`LOBBY_NOT_WAITING`) |
| LOBBY-MEMBER-05 | Token | `playerToken` is returned once, in `LobbyMembership`, and never appears in `Lobby` |

## Heartbeat and polling

Clients poll `GET /api/v1/lobbies/{code}` with their `X-Player-Token`. Each authenticated poll
records that player as seen.

| Rule ID | Status | Client polls every | Lobby service does |
|---|---|---|---|
| LOBBY-HEARTBEAT-01 | `WAITING` | 1 s | Removes a member not seen for 15 s. If that member is the host, the lobby ends with `HOST_LEFT` |
| LOBBY-HEARTBEAT-02 | `IN_PROGRESS` | 5 s | Ends the lobby with `HOST_DISCONNECTED` if the host is not seen for 30 s. Other members are not removed |

## Authorization

| Rule ID | Endpoint | Token |
|---|---|---|
| LOBBY-AUTH-01 | Create, join, get session, health | None |
| LOBBY-AUTH-02 | Get lobby | Optional; when present it counts as a heartbeat |
| LOBBY-AUTH-03 | Leave | Required. A player can remove itself; the host can remove anyone |
| LOBBY-AUTH-04 | Start, end | Required, must be the host (`NOT_HOST`) |

A missing token, or one that does not belong to this lobby, is 401 `INVALID_PLAYER_TOKEN`. That
includes polling after being removed for a missed heartbeat: the client shows "You were removed
from the lobby" and returns to the main menu.

## Starting a session

`POST /api/v1/lobbies/{code}/start`:

1. Requires `WAITING` and the host's token.
2. Requires `expectedPlayerIds` to equal the current member list, ignoring order. The host sends
   the members it has open `game` channels to. On a mismatch (someone joined or left since the
   host's last poll) it returns 409 `LOBBY_CHANGED`; the host waits for the next poll and tries
   again.
3. Calls the world service `POST /api/v1/worlds` with body `{}`, with a 5 s timeout. On
   failure returns 502 `WORLD_SERVICE_UNAVAILABLE` and stays `WAITING`.
4. Creates a `sessionId`, records `startedAt` and the current members, and moves to
   `IN_PROGRESS`.
5. Returns `SessionDetails`. The same object is served by `GET .../session` until the lobby is
   deleted.

The lobby service passes the world config through unchanged. It does not read or validate it
beyond JSON parsing, so world config changes never require a lobby service change.

The world service URL is configuration (`WORLD_SERVICE_URL`, default `http://localhost:8083`).

## Error codes

| Rule ID | Status | Code | When |
|---|---|---|---|
| LOBBY-ERROR-01 | 400 | `VALIDATION_FAILED` | Body or path fails validation |
| LOBBY-ERROR-02 | 401 | `INVALID_PLAYER_TOKEN` | Token missing or not a member |
| LOBBY-ERROR-03 | 403 | `NOT_HOST` | Host-only action by a non-host |
| LOBBY-ERROR-04 | 403 | `FORBIDDEN` | Removing another player without being host |
| LOBBY-ERROR-05 | 404 | `LOBBY_NOT_FOUND` | No live lobby with this code |
| LOBBY-ERROR-06 | 404 | `PLAYER_NOT_FOUND` | Player is not in this lobby |
| LOBBY-ERROR-07 | 409 | `LOBBY_FULL` | Already 5 members |
| LOBBY-ERROR-08 | 409 | `LOBBY_NOT_WAITING` | Join or start after the session started or ended |
| LOBBY-ERROR-09 | 409 | `LOBBY_CHANGED` | Start with `expectedPlayerIds` that differ from the members |
| LOBBY-ERROR-10 | 409 | `NAME_TAKEN` | Name already used in this lobby |
| LOBBY-ERROR-11 | 409 | `SESSION_NOT_STARTED` | Get session before start |
| LOBBY-ERROR-12 | 409 | `SESSION_NOT_IN_PROGRESS` | End when not `IN_PROGRESS` |
| LOBBY-ERROR-13 | 502 | `WORLD_SERVICE_UNAVAILABLE` | World service failed or timed out |
| LOBBY-ERROR-14 | 500 | `INTERNAL_ERROR` | Anything unexpected |

## Storage

In memory. Restarting the service drops every lobby. Ended lobbies are deleted 1 hour after
ending.
