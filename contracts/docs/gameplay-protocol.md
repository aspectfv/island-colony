# Gameplay protocol

Messages between players over WebRTC DataChannels. Schemas: `schemas/gameplay.schema.json`.
Examples: `examples/gameplay/`.

## Topology

Star. Each peer has one `RTCPeerConnection`, to the host. Peers never connect to each other. The
host relays movement and broadcasts every state change.

The host's own client runs the same gameplay code as a peer. Its requests go to the local host
logic through the same `NetworkAdapter` interface, so they are validated by the same rules and
produce the same events. Gameplay code never checks "am I the host" to decide whether an action
is allowed.

## Channels

The host creates both channels on each connection before sending its offer.

| Label | Options | Carries |
|---|---|---|
| `game` | `{ ordered: true }` (reliable) | Everything except movement |
| `movement` | `{ ordered: false, maxRetransmits: 0 }` | `PLAYER_MOVE`, `PLAYER_MOVED` |

Each message is one JSON text frame. Keep every message under 64 KiB; the largest in v1 is
`STATE_SNAPSHOT`, which stays far below that because static world data is not in it.

## Messages

| Type | Direction | Channel | Has `seq` | Purpose |
|---|---|---|---|---|
| `SESSION_STARTED` | host to all | game | no | Session exists; fetch the world config |
| `CLIENT_READY` | peer to host | game | no | World loaded, send me the state |
| `STATE_SNAPSHOT` | host to one | game | yes (`seq` of last applied event) | Full state for a peer that just became ready |
| `PLAYER_JOINED` | host to all | game | yes | A player entered the world |
| `PLAYER_LEFT` | host to all | game | yes | A player disconnected |
| `GATHER_RESOURCE` | peer to host | game | no | Request to gather a node |
| `RESOURCE_GATHERED` | host to all | game | yes | Gather accepted; new totals |
| `PLACE_BUILDING` | peer to host | game | no | Request to place a structure |
| `BUILDING_PLACED` | host to all | game | yes | Placement accepted; new totals |
| `OBJECTIVE_UPDATED` | host to all | game | yes | Current objective advanced |
| `SESSION_COMPLETED` | host to all | game | yes | Last objective done; carries the summary |
| `SESSION_ENDED` | host to all | game | yes | Host ended the session early; carries the summary |
| `ACTION_REJECTED` | host to requester | game | no | Request refused, with a code |
| `PLAYER_MOVE` | peer to host | movement | no | Own position, at most 20 per second |
| `PLAYER_MOVED` | host to all others | movement | no | Someone's position |

## Lifecycle

1. **Lobby phase.** Channels are open but the session has not started. The host sends nothing but
   `SESSION_STARTED`. Peers send nothing.
2. **Start.** After the lobby service returns `SessionDetails`, the host broadcasts
   `SESSION_STARTED`. A peer that polls the lobby and sees `IN_PROGRESS` but has not received
   `SESSION_STARTED` within 10 s shows a connection error and leaves. A peer whose own protocol version differs from `protocolVersion` shows a
   "version mismatch" error and leaves. Otherwise it fetches
   `GET /api/v1/lobbies/{code}/session`, builds the world, and sends `CLIENT_READY`.
3. **Ready.** The host replies to `CLIENT_READY` with `STATE_SNAPSHOT` to that peer, then
   broadcasts `PLAYER_JOINED` for it. The player's starting position is its slot's spawn point,
   with Y from the terrain. The host's own player is in `players` from the moment the session
   starts: it sends no `CLIENT_READY`, gets no `PLAYER_JOINED`, and uses no `seq`.
4. **Play.** Requests and events as described below.
5. **End.** `SESSION_COMPLETED` or `SESSION_ENDED`, then the host closes connections after a
   short grace period (2 s) so the final messages arrive. Peers stay on the session-complete
   screen; a connection closing after either message is expected, not a host disconnect.

## Ordering and the snapshot

The host numbers every state-changing event with `seq`, starting at 1 and increasing by exactly 1.
`STATE_SNAPSHOT.seq` is the last event already reflected in its `state`.

A peer:

1. Buffers `seq` events that arrive before its snapshot.
2. Applies the snapshot.
3. Drops buffered or later events with `seq <= snapshot.seq`, and applies the rest in order.

The `game` channel is reliable and ordered, so a gap in `seq` after the snapshot is a bug. Log it.

Peers never change shared state on their own. The UI may show a pending indicator after sending a
request, then update when the host's event or `ACTION_REJECTED` arrives.

## Host validation

The host processes requests one at a time, in arrival order across all players. It uses its
latest `PLAYER_MOVE` position for the requester. Range checks allow 0.5 m of slack for latency.

### `GATHER_RESOURCE`

Checked in this order; the first failure is the rejection code.

| # | Check | Rejection code |
|---|---|---|
| 1 | Session status is `ACTIVE` | `SESSION_NOT_ACTIVE` |
| 2 | Requester has sent `CLIENT_READY` (always true for the host) | `PLAYER_NOT_READY` |
| 3 | `resourceId` exists in the world config | `RESOURCE_NOT_FOUND` |
| 4 | Node has charges left | `RESOURCE_DEPLETED` |
| 5 | Ground distance to the node is at most `rules.gathering.interactionRange` | `OUT_OF_RANGE` |
| 6 | At least `rules.gathering.cooldownMs` since this player's last accepted gather | `ON_COOLDOWN` |

On success the host takes one charge, adds `yieldPerGather` of the node type's resource to the
shared total, and broadcasts `RESOURCE_GATHERED`. A node with 0 charges left is depleted: clients
remove it and it no longer blocks placement.

### `PLACE_BUILDING`

| # | Check | Rejection code |
|---|---|---|
| 1 | Session status is `ACTIVE` | `SESSION_NOT_ACTIVE` |
| 2 | Requester has sent `CLIENT_READY` (always true for the host) | `PLAYER_NOT_READY` |
| 3 | The current objective is `BUILD` with this `structureType` | `STRUCTURE_NOT_AVAILABLE` |
| 4 | Shared totals cover the structure's `cost` | `INSUFFICIENT_RESOURCES` |
| 5 | Ground distance to `position` is at most `rules.building.placementRange` | `OUT_OF_RANGE` |
| 6 | The footprint circle lies inside one build zone: `distance(position, zone.center) + footprintRadius <= zone.radius` | `INVALID_PLACEMENT` |
| 7 | The footprint does not overlap a placed structure or a non-depleted node (distance between centers less than the sum of radii) | `INVALID_PLACEMENT` |

On success the host deducts the cost, assigns the next `structure-<n>` ID, and broadcasts
`BUILDING_PLACED`.

### Other rejection codes

| Code | When |
|---|---|
| `BAD_REQUEST` | A known request type is malformed. Only sent if a `requestId` can be read |
| `DUPLICATE_REQUEST` | The requester already used this `requestId` in this session. Nothing is applied |

Unknown codes must be handled with a generic "action failed" message.

## Objectives

`objectiveIndex` points into `rules.objectives`. After each accepted gather or placement, the host
checks the current objective:

| Kind | Complete when |
|---|---|
| `GATHER` | Every amount in `target` is at most the shared total. Nothing is deducted |
| `BUILD` | A structure of `structureType` was just placed |

When it completes, the host increments `objectiveIndex` and broadcasts `OBJECTIVE_UPDATED`. It
then checks the new objective right away, since a `GATHER` target may already be met. When the
index reaches `rules.objectives.length`, the host sets status to `COMPLETED` and broadcasts
`SESSION_COMPLETED` with the summary. The host runs the same check once when the session starts.

A client that does not recognize an objective's `kind` shows its `description`.

## Movement

Peers send `PLAYER_MOVE` while moving, at most 20 per second (15 is a good default), and 2 per
second while standing still. The idle updates matter: the channel drops lost messages, and the
host range-checks gathers and placements against the latest position it has. The host relays each as `PLAYER_MOVED` to everyone except the sender, and sends its
own movement the same way.

`n` starts at 1 and increases by 1 per message from each sender. The channel is unordered, so
receivers drop a message whose `n` is not greater than the last one seen from that player
(initially 0). Render remote players
about 100 ms in the past and interpolate between the two surrounding updates.

The host does not validate movement in the MVP. Anti-cheat is out of scope.

## Disconnects

| Event | Host does | Peers do |
|---|---|---|
| A peer's connection closes | Broadcasts `PLAYER_LEFT` with reason `DISCONNECTED` and forgets the player | Remove the avatar |
| The host's connection closes before `SESSION_COMPLETED` or `SESSION_ENDED` | n/a | Show "Host left", return to the main menu |
| The host's connection closes after either of those | n/a | Nothing; stay on the session-complete screen |

## Unknown and unexpected messages

Ignore unknown `type` values. Ignore messages that are valid but not expected in the current
phase, for example `GATHER_RESOURCE` before the session starts (the host may reply
`SESSION_NOT_ACTIVE` instead if the request has a `requestId`).
