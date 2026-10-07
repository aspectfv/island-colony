import { describe, expect, it } from "vitest";
import { sampleHeight as referenceSampleHeight } from "../../../contracts/scripts/sample-height.mjs";
import { fixtureWorld } from "../shared/fixture-world";
import { createTerrainMesh, sampleHeight } from "./terrain";

const island = fixtureWorld.island;

describe("sampleHeight", () => {
  it("matches the reference sampler across the whole map and beyond its edges", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 260 - 130;
    for (let i = 0; i < 2000; i++) {
      const x = random();
      const z = random();
      expect(sampleHeight(island, x, z)).toBeCloseTo(referenceSampleHeight(island, x, z), 9);
    }
  });

  it("returns the stored height exactly at grid points", () => {
    const cell = island.size / (island.resolution - 1);
    expect(sampleHeight(island, -island.size / 2 + 37 * cell, -island.size / 2 + 52 * cell)).toBe(
      island.heights[52 * island.resolution + 37],
    );
  });
});

describe("createTerrainMesh", () => {
  it("builds two triangles per heightmap cell spanning the full height range", () => {
    const terrain = createTerrainMesh(island);
    const cells = (island.resolution - 1) ** 2;

    expect(terrain.geometry.getAttribute("position").count).toBe(cells * 6);
    terrain.geometry.computeBoundingBox();
    expect(terrain.geometry.boundingBox?.min.y).toBeCloseTo(Math.min(...island.heights));
    expect(terrain.geometry.boundingBox?.max.y).toBeCloseTo(Math.max(...island.heights));
    expect(terrain.geometry.boundingBox?.max.x).toBeCloseTo(island.size / 2);
  });
});
