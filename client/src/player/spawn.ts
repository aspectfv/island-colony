import type { SpawnPoint, WorldConfig } from "../shared/contracts/world";

// Spawn points are indexed by lobby slot. The contract guarantees at least five; a higher slot
// wraps around rather than failing.
export function spawnPointFor(world: WorldConfig, slot: number): SpawnPoint {
  const spawn = world.spawnPoints[slot % world.spawnPoints.length];
  if (!spawn) throw new Error("World config has no spawn points");
  return spawn;
}
