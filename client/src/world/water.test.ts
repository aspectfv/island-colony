import { describe, expect, it } from "vitest";
import type { Island } from "../shared/contracts/world";
import { createWater } from "./water";

const seabedY = (island: Island) => createWater(island).children[0]!.position.y;

describe("createWater", () => {
  it("puts the seabed at the deepest terrain point", () => {
    expect(seabedY({ size: 10, resolution: 2, waterLevel: 0, heights: [-6, 1, 1, 1] })).toBeCloseTo(
      -6.01,
    );
  });

  it("keeps the seabed below the water when no terrain is underwater", () => {
    expect(seabedY({ size: 10, resolution: 2, waterLevel: 0, heights: [1, 1, 1, 1] })).toBeLessThan(
      0,
    );
  });
});
