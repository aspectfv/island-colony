import { describe, expect, it } from "vitest";
import type { Island } from "../shared/contracts/world";
import { MAX_PITCH, MIN_PITCH, applyMouse, cameraPosition } from "./follow-camera";

const flat: Island = { size: 100, resolution: 2, waterLevel: 0, heights: [1, 1, 1, 1] };
const hill: Island = { size: 100, resolution: 2, waterLevel: 0, heights: [30, 30, 30, 30] };

describe("applyMouse", () => {
  it("turns right when the mouse moves right", () => {
    expect(applyMouse({ yaw: 0, pitch: 0.5, distance: 9 }, 100, 0).yaw).toBeLessThan(0);
  });

  it("clamps pitch so the camera never flips over or under", () => {
    expect(applyMouse({ yaw: 0, pitch: 0.5, distance: 9 }, 0, 10_000).pitch).toBe(MAX_PITCH);
    expect(applyMouse({ yaw: 0, pitch: 0.5, distance: 9 }, 0, -10_000).pitch).toBe(MIN_PITCH);
  });
});

describe("cameraPosition", () => {
  it("sits behind and above the target", () => {
    const position = cameraPosition(
      flat,
      { x: 0, y: 1, z: 0 },
      { yaw: 0, pitch: 0.5, distance: 10 },
    );
    expect(position.x).toBeCloseTo(0);
    expect(position.z).toBeCloseTo(10 * Math.cos(0.5));
    expect(position.y).toBeGreaterThan(1);
  });

  it("never goes below the ground", () => {
    const position = cameraPosition(
      hill,
      { x: 0, y: 1, z: 0 },
      { yaw: 0, pitch: 0.2, distance: 10 },
    );
    expect(position.y).toBeCloseTo(30.5);
  });
});
