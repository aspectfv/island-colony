import { describe, expect, it } from "vitest";
import { fixtureWorld } from "../shared/fixture-world";
import { spawnPointFor } from "./spawn";

describe("spawnPointFor", () => {
  it("uses the spawn point for the slot", () => {
    expect(spawnPointFor(fixtureWorld, 3)).toBe(fixtureWorld.spawnPoints[3]);
  });

  it("wraps around for slots beyond the listed spawn points", () => {
    expect(spawnPointFor(fixtureWorld, fixtureWorld.spawnPoints.length + 1)).toBe(
      fixtureWorld.spawnPoints[1],
    );
  });
});
