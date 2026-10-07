import { Group, Mesh, MeshLambertMaterial, PlaneGeometry } from "three";
import type { Island } from "../shared/contracts/world";

const SEABED_COLOR = 0xc9b27a;

export function createWater(island: Island): Group {
  // Both planes extend well past the map so the horizon is all sea and the map edge never shows.
  const extent = island.size * 6;
  const surface = new Mesh(
    new PlaneGeometry(extent, extent),
    new MeshLambertMaterial({ color: 0x3a9bd9, transparent: true, opacity: 0.8 }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = island.waterLevel;

  // Seabed under and around the island at its deepest point.
  const seabed = new Mesh(
    new PlaneGeometry(extent, extent),
    new MeshLambertMaterial({ color: SEABED_COLOR }),
  );
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = Math.min(...island.heights) - 0.01;

  const water = new Group();
  water.name = "water";
  water.add(seabed, surface);
  return water;
}
