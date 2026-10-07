// Development-only scenario that drives the renderer with scripted gameplay until the game state
// store exists. Open the client with ?demo to run it. Never imported in production builds.
import type { PlacedStructure, PlayerMoved } from "../shared/contracts/gameplay";
import type { WorldConfig } from "../shared/contracts/world";
import type { RemoteAvatars } from "../player/remote-avatars";
import { yawOf } from "../player/movement";
import { sampleHeight } from "../world/terrain";
import type { ResourceNodeLayer } from "../world/resource-nodes";
import type { StructureLayer } from "../world/structures";

export interface DemoContext {
  world: WorldConfig;
  structures: StructureLayer;
  resourceNodes: ResourceNodeLayer;
  remoteAvatars: RemoteAvatars;
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

// Gathers the nodes nearest the colony one charge at a time, so some shake and some disappear.
function scheduleGathering(
  context: DemoContext,
  at: (seconds: number, action: () => void) => void,
) {
  const nearest = [...context.world.resourceNodes]
    .sort((a, b) => Math.hypot(a.position.x, a.position.z) - Math.hypot(b.position.x, b.position.z))
    .slice(0, 6);
  const charges = Object.fromEntries(
    context.world.rules.nodeTypes.map((type) => [type.nodeType, type.charges]),
  );
  let seconds = 1;
  for (const node of nearest) {
    for (let left = (charges[node.nodeType] ?? 1) - 1; left >= 0; left--) {
      seconds += 0.6;
      at(seconds, () => context.resourceNodes.gathered(node.resourceId, left));
    }
  }
}

// Four players walking circles around the colony, sending 15 updates a second over a jittery
// network: each message is delayed 20 to 120 ms, so some arrive out of order.
function simulateRemotePlayers(context: DemoContext): (deltaSeconds: number) => void {
  const bots = [1, 2, 3, 4].map((slot) => ({
    playerId: `bot-${slot}`,
    slot,
    n: 0,
    angle: slot * 1.5,
  }));
  for (const bot of bots) context.remoteAvatars.add(bot.playerId, bot.slot);
  const inFlight: Array<{ deliverAt: number; message: PlayerMoved }> = [];
  let sinceSend = 0;

  return (deltaSeconds) => {
    const now = performance.now();
    for (const bot of bots) bot.angle += deltaSeconds * 0.35;
    sinceSend += deltaSeconds;
    if (sinceSend >= 1 / 15) {
      sinceSend = 0;
      for (const bot of bots) {
        const radius = 9 + bot.slot;
        const x = Math.cos(bot.angle) * radius;
        const z = Math.sin(bot.angle) * radius;
        const tangent = { x: -Math.sin(bot.angle), z: Math.cos(bot.angle) };
        bot.n += 1;
        inFlight.push({
          deliverAt: now + 20 + Math.random() * 100,
          message: {
            type: "PLAYER_MOVED",
            playerId: bot.playerId,
            n: bot.n,
            position: { x, y: sampleHeight(context.world.island, x, z), z },
            yaw: yawOf(tangent),
            animation: "walk",
          },
        });
      }
    }
    for (let i = inFlight.length - 1; i >= 0; i--) {
      if (inFlight[i]!.deliverAt <= now) {
        context.remoteAvatars.receive(inFlight[i]!.message, now);
        inFlight.splice(i, 1);
      }
    }
  };
}

export function startDemo(context: DemoContext): void {
  let elapsed = 0;
  const pending: Array<{ seconds: number; action: () => void }> = [];
  const at = (seconds: number, action: () => void) => pending.push({ seconds, action });

  scheduleStructures(context, at);
  scheduleGathering(context, at);
  context.onFrame(simulateRemotePlayers(context));

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
