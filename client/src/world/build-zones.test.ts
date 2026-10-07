import { describe, expect, it } from "vitest";
import { fixtureWorld } from "../shared/fixture-world";
import { createBuildZoneOutline } from "./build-zones";
import { sampleHeight } from "./terrain";

describe("createBuildZoneOutline", () => {
  it("traces the zone's circle just above the ground", () => {
    const zone = fixtureWorld.buildZones[0]!;
    const outline = createBuildZoneOutline(zone, fixtureWorld.island);
    const positions = outline.geometry.getAttribute("position");

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      expect(Math.hypot(x - zone.center.x, z - zone.center.z)).toBeCloseTo(zone.radius, 4);
      expect(positions.getY(i)).toBeCloseTo(sampleHeight(fixtureWorld.island, x, z) + 0.08, 4);
    }
  });
});
