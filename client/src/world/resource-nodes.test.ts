import { describe, expect, it } from "vitest";
import { fixtureWorld } from "../shared/fixture-world";
import { ResourceNodeLayer, createResourceNode } from "./resource-nodes";

describe("ResourceNodeLayer", () => {
  it("places one object per node at its position, yaw and scale", () => {
    const { group } = new ResourceNodeLayer(fixtureWorld.resourceNodes);

    expect(group.children).toHaveLength(fixtureWorld.resourceNodes.length);
    for (const node of fixtureWorld.resourceNodes) {
      const object = group.getObjectByName(node.resourceId);
      expect(object?.position.toArray()).toEqual([
        node.position.x,
        node.position.y,
        node.position.z,
      ]);
      expect(object?.rotation.y).toBeCloseTo(node.yaw);
      expect(object?.scale.x).toBeCloseTo(node.scale);
    }
  });

  it("renders unknown node types as a placeholder instead of failing", () => {
    const object = createResourceNode({
      resourceId: "berry-bush-0001",
      nodeType: "berry-bush",
      position: { x: 1, y: 2, z: 3 },
      yaw: 0,
      scale: 1,
    });

    expect(object.name).toBe("berry-bush-0001");
    expect(object.children).toHaveLength(1);
  });

  it("shakes on a gather and settles back without removing the node", () => {
    const layer = new ResourceNodeLayer(fixtureWorld.resourceNodes);
    layer.gathered("tree-0001", 2);
    layer.update(0.05);
    expect(layer.group.getObjectByName("tree-0001")?.rotation.z).not.toBe(0);

    layer.update(1);
    expect(layer.isAvailable("tree-0001")).toBe(true);
    expect(layer.group.getObjectByName("tree-0001")?.rotation.z).toBeCloseTo(0);
  });

  it("stops being available at once and is removed after shrinking when depleted", () => {
    const layer = new ResourceNodeLayer(fixtureWorld.resourceNodes);
    layer.gathered("tree-0001", 0);
    expect(layer.isAvailable("tree-0001")).toBe(false);

    for (let i = 0; i < 20; i++) layer.update(0.05);
    expect(layer.group.getObjectByName("tree-0001")).toBeUndefined();
  });

  it("removes nodes a snapshot reports as depleted without animating", () => {
    const layer = new ResourceNodeLayer(fixtureWorld.resourceNodes);
    layer.applyCharges({ "tree-0001": 0, "rock-0001": 2 });

    expect(layer.group.getObjectByName("tree-0001")).toBeUndefined();
    expect(layer.isAvailable("rock-0001")).toBe(true);
  });

  it("ignores gathers for nodes it does not have", () => {
    const layer = new ResourceNodeLayer(fixtureWorld.resourceNodes);
    layer.gathered("tree-9999", 0);
    layer.update(1);

    expect(layer.group.children).toHaveLength(fixtureWorld.resourceNodes.length);
  });
});
