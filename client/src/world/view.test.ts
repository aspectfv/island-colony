import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";
import { resizeCamera } from "./view";

describe("resizeCamera", () => {
  it("matches the camera aspect to the viewport", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);

    resizeCamera(camera, 1600, 900);

    expect(camera.aspect).toBeCloseTo(16 / 9);
  });

  it("does not divide by zero when the viewport has no height", () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);

    resizeCamera(camera, 800, 0);

    expect(camera.aspect).toBe(800);
  });
});
