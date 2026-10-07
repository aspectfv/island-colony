import { describe, expect, it } from "vitest";
import type { PlacedStructure } from "../shared/contracts/gameplay";
import { fixtureWorld } from "../shared/fixture-world";
import { StructureLayer } from "./structures";
import { sampleHeight } from "./terrain";

const island = fixtureWorld.island;
const camp: PlacedStructure = {
  structureId: "structure-1",
  structureType: "camp",
  position: { x: 3, z: -2 },
  yaw: 1.2,
  placedBy: "3f6c2a1e-8b4d-4c2e-9a71-0d5e2b7c4f10",
};

describe("StructureLayer", () => {
  it("places a structure on the terrain with its yaw", () => {
    const layer = new StructureLayer(island);
    layer.place(camp);

    const object = layer.group.getObjectByName("structure-1");
    expect(object?.position.x).toBe(3);
    expect(object?.position.y).toBeCloseTo(sampleHeight(island, 3, -2));
    expect(object?.position.z).toBe(-2);
    expect(object?.rotation.y).toBeCloseTo(1.2);
  });

  it("ignores a structure it already has", () => {
    const layer = new StructureLayer(island);
    layer.sync([camp, camp]);
    layer.place(camp);

    expect(layer.group.children).toHaveLength(1);
  });

  it("renders unknown structure types as a placeholder instead of failing", () => {
    const layer = new StructureLayer(island);
    layer.place({ ...camp, structureId: "structure-9", structureType: "lighthouse" });

    expect(layer.group.getObjectByName("structure-9")?.children).toHaveLength(1);
  });
});
