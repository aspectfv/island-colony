import { Group } from "three";
import type { WorldConfig } from "../shared/contracts/world";
import { createBuildZones } from "./build-zones";
import { createTerrainMesh } from "./terrain";
import { createWater } from "./water";

// Static scenery. Resource nodes change during play and live in ResourceNodeLayer.
export function createIsland(world: WorldConfig): Group {
  const island = new Group();
  island.name = "island";
  island.add(
    createTerrainMesh(world.island),
    createWater(world.island),
    createBuildZones(world.buildZones, world.island),
  );
  return island;
}
