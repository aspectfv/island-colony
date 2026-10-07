# Client

Three.js game client, built with TypeScript and Vite.

Modules:

| Module | Responsibility |
|---|---|
| `world` | Scene, terrain, lighting, water, assets |
| `player` | Movement, camera, player representation |
| `gameplay` | Gathering, building, objectives |
| `networking` | WebRTC and state synchronization |
| `ui` | Menus, lobby, HUD, build interface |
| `services` | Adapters for backend and mock implementations |
| `shared` | Shared types, configuration, utilities |

The client runs in three modes: local single player with no backend, mock multiplayer with
simulated players, and integrated multiplayer against the real services. When a player hosts,
their client also holds the authoritative game state, validates requests from peers, and
broadcasts accepted changes.
