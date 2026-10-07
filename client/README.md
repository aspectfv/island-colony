# Client

Three.js game client, built with TypeScript and Vite.

## Commands

Run from `client/`. Needs Node 22 or later.

| Task                          | Command                                        |
| ----------------------------- | ---------------------------------------------- |
| Install                       | `npm install`                                  |
| Run locally                   | `npm run dev`, then open http://localhost:5173 |
| Build (type check and bundle) | `npm run build`                                |
| Test                          | `npm test`                                     |
| Lint and check formatting     | `npm run lint`                                 |
| Format                        | `npm run format`                               |

## Modules

Each module talks to the others through interfaces, not through each other's internals.

| Module           | Responsibility                                    |
| ---------------- | ------------------------------------------------- |
| `src/world`      | Renderer, scene, terrain, lighting, water, assets |
| `src/player`     | Movement, camera, player representation           |
| `src/gameplay`   | Gathering, building, objectives, host rules       |
| `src/networking` | WebRTC and state synchronization                  |
| `src/ui`         | Menus, lobby, HUD, build interface                |
| `src/services`   | Adapters for backend services and their mocks     |
| `src/shared`     | Shared types, configuration, utilities            |

`src/main.ts` wires the modules together.

## Modes

The client runs in three modes: local single player with no backend, mock multiplayer with
simulated players, and integrated multiplayer against the real services. When a player hosts,
their client also holds the authoritative game state, validates requests from peers, and
broadcasts accepted changes. The contracts in `../contracts` define every boundary.
