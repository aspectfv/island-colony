# Client

Three.js game client, built with TypeScript and Vite.

## Commands

Run from `client/`. Needs Node 22 or later.

| Task                          | Command                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| Install                       | `npm install`                                                          |
| Run locally                   | `npm run dev`, then open http://localhost:5173                         |
| Build (type check and bundle) | `npm run build`                                                        |
| Test                          | `npm test`                                                             |
| Lint and check formatting     | `npm run lint`                                                         |
| Format                        | `npm run format`                                                       |
| Regenerate contract types     | `npm run contracts:types` (after any change in `../contracts/schemas`) |

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

`src/main.ts` wires the modules together. `src/shared/contracts/` holds types generated from
`../contracts/schemas`; never edit them by hand. In local mode the world comes from
`../contracts/examples/world/WorldConfig.json` (`src/shared/fixture-world.ts`).

## Controls

| Input              | Action                              |
| ------------------ | ----------------------------------- |
| Click the game     | Capture the mouse (Esc releases it) |
| Mouse              | Orbit the camera                    |
| WASD or arrow keys | Move relative to the camera         |

## Demo scenario

Until the game state store exists, `npm run dev` and open http://localhost:5173/?demo to drive the
renderer with scripted gameplay (`src/dev/demo.ts`). The demo is never part of production builds.

Other development-only options: `?stats` shows frames per second and draw calls, and
`?world=minimal` loads the tiny test world instead of the fixture island. Combine them with `&`.

## Modes

The client runs in three modes: local single player with no backend, mock multiplayer with
simulated players, and integrated multiplayer against the real services. When a player hosts,
their client also holds the authoritative game state, validates requests from peers, and
broadcasts accepted changes. The contracts in `../contracts` define every boundary.
