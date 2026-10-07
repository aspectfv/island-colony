import { describe, expect, it } from "vitest";
import { fixtureWorld } from "../shared/fixture-world";
import { createResourceNode, createResourceNodes } from "./resource-nodes";

describe("createResourceNodes", () => {
  it("places one object per node at its position, yaw and scale", () => {
    const group = createResourceNodes(fixtureWorld.resourceNodes);

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
});
