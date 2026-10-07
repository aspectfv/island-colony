# World config

The world config is the single source for the initial island and for the game rules. Schema:
`schemas/world.schema.json`. API: `openapi/world.openapi.yaml`.

| Who | Uses it for |
|---|---|
| World service | Generates it from a seed |
| Lobby service | Passes it through unchanged inside `SessionDetails` |
| Client renderer | Builds terrain, water, nodes, build zones |
| Host gameplay logic | Enforces gathering, building, objectives |
| Client HUD | Resource names, structure names and costs, objective text |

## Development fixture

`examples/world/WorldConfig.json` is a full island (seed 1234) that passes every check below.
Local and mock modes load it instead of calling the world service, so the renderer and gameplay
work can start before the world service exists. `WorldConfig.minimal.json` is a tiny flat world
for unit tests.

## Determinism

The same seed must always produce the same world config from the same world service build. The
generation algorithm is private to the world service and may change between builds; clients never
reproduce it. That is why the config carries an explicit heightmap rather than noise parameters.

## Terrain

`island` is a square heightmap centered on the origin.

| Field | Meaning |
|---|---|
| `size` | Edge length in meters. The map covers x and z from `-size/2` to `size/2` |
| `resolution` | Samples per edge. Cell size is `size / (resolution - 1)` |
| `heights` | `resolution * resolution` values, row-major: index `row * resolution + col`. Row 0 is z = `-size/2`, col 0 is x = `-size/2` |
| `waterLevel` | Y of the water surface. Ground at or below it is water |

Everyone samples terrain height the same way, by bilinear interpolation with positions clamped to
the map. The reference implementation is `sampleHeight` in `scripts/sample-height.mjs`:

```js
const cell = size / (resolution - 1);
const fx = clamp((x + size / 2) / cell, 0, resolution - 1);
const fz = clamp((z + size / 2) / cell, 0, resolution - 1);
const c0 = Math.min(Math.floor(fx), resolution - 2);
const r0 = Math.min(Math.floor(fz), resolution - 2);
const tx = fx - c0, tz = fz - r0;
const top = h(r0, c0) * (1 - tx) + h(r0, c0 + 1) * tx;
const bottom = h(r0 + 1, c0) * (1 - tx) + h(r0 + 1, c0 + 1) * tx;
return top * (1 - tz) + bottom * tz;
```

The renderer may draw the terrain mesh straight from the grid (one vertex per sample) and will
match this sampler on every vertex.

## World content

| Field | Meaning |
|---|---|
| `spawnPoints` | One per lobby slot, indexed by slot. At least 5 |
| `buildZones` | Circles on land where structures may go |
| `resourceNodes` | Trees, rocks, and future node types. `position.y` equals the sampled terrain height. `yaw` and `scale` are visual only |

## Rules

Content and balancing live in `rules`. Changing a number or adding content is a world service
change only.

| Field | Meaning |
|---|---|
| `resources` | Resource types and display names. The HUD lists these, in this order |
| `nodeTypes` | What each node type yields, how many gathers it allows, and its footprint |
| `structures` | Cost, footprint, display name |
| `objectives` | Ordered list. `GATHER` objectives complete on reaching a total; `BUILD` objectives complete on placing a structure |
| `startingResources` | Shared totals at session start |
| `gathering.interactionRange`, `gathering.cooldownMs` | Gather limits enforced by the host |
| `building.placementRange` | How far from the player a structure may be placed |

How the host applies these is in `gameplay-protocol.md`.

## Guarantees checked by `npm test`

The world service must produce configs that satisfy these, and its own tests should check them
the same way:

1. `heights` has exactly `resolution²` values.
2. Every spawn point, build zone center, and resource node is on land.
3. Every node's `position.y` is within 0.05 m of the sampled terrain height.
4. No node footprint overlaps a build zone.
5. IDs are unique, and every resource, node type, and structure reference points at a defined
   entry.
