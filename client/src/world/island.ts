import { Group } from "three";
import type { WorldConfig } from "../shared/contracts/world";
import { createBuildZones } from "./build-zones";
import { createResourceNodes } from "./resource-nodes";
import { createTerrainMesh } from "./terrain";
import { createWater } from "./water";

export function createIsland(world: WorldConfig): Group {
  const island = new Group();
  island.name = "island";
  island.add(
    createTerrainMesh(world.island),
    createWater(world.island),
    createResourceNodes(world.resourceNodes),
    createBuildZones(world.buildZones, world.island),
  );
  return island;
}
