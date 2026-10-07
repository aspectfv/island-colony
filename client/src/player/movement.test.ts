import { describe, expect, it } from "vitest";
import type { Island } from "../shared/contracts/world";
import { forwardOf, isWalkable, moveDirection, step, turnToward, yawOf } from "./movement";

// 3x3 heightmap, 20 m across: land everywhere except the east column, which is water.
const island: Island = {
  size: 20,
  resolution: 3,
  waterLevel: 0,
  heights: [1, 1, -1, 1, 1, -1, 1, 1, -1],
};

describe("forwardOf and yawOf", () => {
  it("faces -Z at yaw 0 and turns toward -X as yaw grows", () => {
    expect(forwardOf(0).x).toBeCloseTo(0);
    expect(forwardOf(0).z).toBeCloseTo(-1);
    expect(forwardOf(Math.PI / 2).x).toBeCloseTo(-1);
  });

  it("are inverses", () => {
    for (const yaw of [-3, -1.2, 0, 0.7, 2.9]) expect(yawOf(forwardOf(yaw))).toBeCloseTo(yaw);
  });
});

describe("moveDirection", () => {
  it("moves away from the camera on forward", () => {
    const direction = moveDirection({ forward: 1, right: 0 }, 0);
    expect(direction.x).toBeCloseTo(0);
    expect(direction.z).toBeCloseTo(-1);
  });

  it("strafes to the camera's right", () => {
    const direction = moveDirection({ forward: 0, right: 1 }, 0);
    expect(direction.x).toBeCloseTo(1);
    expect(direction.z).toBeCloseTo(0);
  });

  it("keeps diagonals at unit speed", () => {
    const direction = moveDirection({ forward: 1, right: 1 }, 1.1);
    expect(Math.hypot(direction.x, direction.z)).toBeCloseTo(1);
  });

  it("is zero with no input", () => {
    expect(moveDirection({ forward: 0, right: 0 }, 2)).toEqual({ x: 0, z: 0 });
  });
});

describe("step", () => {
  it("moves freely on land", () => {
    expect(step(island, { x: -5, z: 0 }, { x: 0, z: -1 }, 2)).toEqual({ x: -5, z: -2 });
  });

  it("slides along the shore instead of entering the water", () => {
    const diagonal = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
    const next = step(island, { x: 2, z: 0 }, diagonal, 4);
    expect(isWalkable(island, next)).toBe(true);
    expect(next.x).toBe(2);
    expect(next.z).toBeCloseTo(-4 * Math.SQRT1_2);
  });

  it("stays put when every option is water or off the map", () => {
    expect(step(island, { x: -9, z: -9 }, { x: -1, z: 0 }, 5)).toEqual({ x: -9, z: -9 });
  });
});

describe("turnToward", () => {
  it("turns at most the step size", () => {
    expect(turnToward(0, 1, 0.25)).toBeCloseTo(0.25);
  });

  it("takes the short way across the -PI/PI seam", () => {
    expect(turnToward(3, -3, 0.1)).toBeCloseTo(3.1);
  });

  it("snaps when within one step", () => {
    expect(turnToward(1, 1.05, 0.1)).toBe(1.05);
  });
});
