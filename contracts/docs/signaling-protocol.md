# Signaling protocol

WebSocket protocol for setting up WebRTC connections. Schemas:
`schemas/signaling.schema.json`. Examples: `examples/signaling/`.

The signaling service is a room-based relay. It does not know who the host is, does not read SDP
or ICE contents, and never carries gameplay traffic.

## Connection

| Item | Value |
|---|---|
| URL | `ws://localhost:8082/ws` in development |
| Frames | One JSON text frame per message |
| Max message size | 64 KiB. Larger frames get `ERROR` `INVALID_MESSAGE` |
| Keepalive | The server pings every 20 s and closes a socket that misses 2 pongs |

## Messages

Clients address messages with `to`. The server forwards them with `to` replaced by `from`, so a
receiver always knows the sender and cannot be told a false one.

| Client sends | Server sends | Meaning |
|---|---|---|
| `JOIN {lobbyCode, playerId}` | `JOINED {lobbyCode, playerId, peers}` to the joiner | Enter the room named by the lobby code |
| | `PEER_JOINED {playerId}` to everyone else | Someone entered |
| `OFFER {to, description}` | `OFFER {from, description}` to `to` | SDP offer |
| `ANSWER {to, description}` | `ANSWER {from, description}` to `to` | SDP answer |
| `ICE_CANDIDATE {to, candidate}` | `ICE_CANDIDATE {from, candidate}` to `to` | Trickle ICE. `candidate: null` means end of candidates |
| `LEAVE` | `PEER_LEFT {playerId}` to everyone else | Leave the room. Closing the socket does the same |
| | `ERROR {code, message}` | Something was wrong with the last message. The socket stays open |

## Server rules

1. The first message on a socket must be `JOIN`. Anything else gets `NOT_JOINED`.
2. A socket joins one room at most. A second `JOIN` gets `ALREADY_JOINED`.
3. A room holds at most 5 sockets. The sixth `JOIN` gets `ROOM_FULL`.
4. A `playerId` can be in a room once. A duplicate gets `PLAYER_ALREADY_CONNECTED`.
5. `to` must be a player in the same room, otherwise `PEER_NOT_FOUND`.
6. Rooms are created on first `JOIN` and deleted when the last socket leaves.
7. The server trusts `lobbyCode` and `playerId` as given. Checking them against the lobby service
   is out of scope for the MVP.

## Error codes

| Code | Meaning |
|---|---|
| `INVALID_MESSAGE` | Not JSON, missing required fields, or too large |
| `UNKNOWN_TYPE` | `type` is not a client message this server knows |
| `NOT_JOINED` | Sent something before `JOIN` |
| `ALREADY_JOINED` | Sent `JOIN` twice |
| `ROOM_FULL` | Room already has 5 players |
| `PLAYER_ALREADY_CONNECTED` | Another socket is using this `playerId` in this room |
| `PEER_NOT_FOUND` | `to` is not in the room |

## Client rules

These keep negotiation simple and match the star topology.

1. Join the room as soon as the lobby screen opens, and stay joined until the session ends.
2. **The host always makes the offer.** On `JOINED` the host offers to every player in `peers`;
   on `PEER_JOINED` it offers to the new player. Peers only answer.
3. Peers ignore offers from anyone except the lobby's `hostPlayerId`.
4. Send ICE candidates as they appear. Buffer received candidates until the remote description is
   set, then apply them.
5. On `PEER_LEFT`, the host closes that player's `RTCPeerConnection`.
6. **Retrying a failed connection is the peer's job.** If a peer's connection state becomes
   `failed`, or no `game` channel opens within 15 s of `JOINED`, the peer sends `LEAVE` and then
   `JOIN` again. The host sees `PEER_LEFT` then `PEER_JOINED` and makes a fresh offer. After 3
   failed attempts the peer shows a connection error.
7. ICE servers are client configuration, not part of this contract. The default is
   `stun:stun.l.google.com:19302`. Players on the same network connect without it. TURN is out of
   scope for the MVP.
