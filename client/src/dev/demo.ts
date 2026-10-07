// Development-only scenario that drives the renderer with scripted gameplay until the game state
// store exists. Open the client with ?demo to run it. Never imported in production builds.
import type { PlacedStructure } from "../shared/contracts/gameplay";
import type { WorldConfig } from "../shared/contracts/world";
import type { StructureLayer } from "../world/structures";

export interface DemoContext {
  world: WorldConfig;
  structures: StructureLayer;
  onFrame: (task: (deltaSeconds: number) => void) => void;
}

const HOST = "3f6c2a1e-8b4d-4c2e-9a71-0d5e2b7c4f10";

function scheduleStructures(
  context: DemoContext,
  at: (seconds: number, action: () => void) => void,
) {
  const placements: Array<[number, Omit<PlacedStructure, "placedBy">]> = [
    [2, { structureId: "structure-1", structureType: "camp", position: { x: -6, z: 2 }, yaw: 0.4 }],
    [
      4,
      {
        structureId: "structure-2",
        structureType: "storage-hut",
        position: { x: 5, z: -5 },
        yaw: -0.6,
      },
    ],
    [
      6,
      {
        structureId: "structure-3",
        structureType: "signal-beacon",
        position: { x: 22, z: 14 },
        yaw: 0,
      },
    ],
  ];
  for (const [seconds, structure] of placements) {
    at(seconds, () => context.structures.place({ ...structure, placedBy: HOST }));
  }
}

export function startDemo(context: DemoContext): void {
  let elapsed = 0;
  const pending: Array<{ seconds: number; action: () => void }> = [];
  const at = (seconds: number, action: () => void) => pending.push({ seconds, action });

  scheduleStructures(context, at);

  context.onFrame((deltaSeconds) => {
    elapsed += deltaSeconds;
    for (let i = pending.length - 1; i >= 0; i--) {
      const task = pending[i]!;
      if (task.seconds <= elapsed) {
        pending.splice(i, 1);
        task.action();
      }
    }
  });
}
