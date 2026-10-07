import { describe, expect, it } from "vitest";
import type { ResourceNode } from "../shared/contracts/world";
import { fixtureWorld } from "../shared/fixture-world";
import { ResourceNodeLayer } from "../world/resource-nodes";
import { Targeting, findTarget } from "./targeting";

const node = (resourceId: string, x: number, z: number): ResourceNode => ({
  resourceId,
  nodeType: "tree",
  position: { x, y: 1, z },
  yaw: 0,
  scale: 1,
});
const nodes = [node("tree-0001", 2, 0), node("tree-0002", 1, 1), node("rock-0001", 10, 0)];
const all = () => true;

describe("findTarget", () => {
  it("picks the nearest node within range", () => {
    expect(findTarget(nodes, all, { x: 0, z: 0 }, 3)?.resourceId).toBe("tree-0002");
  });

  it("skips nodes that are not available", () => {
    const target = findTarget(nodes, (id) => id !== "tree-0002", { x: 0, z: 0 }, 3);
    expect(target?.resourceId).toBe("tree-0001");
  });

  it("includes a node exactly at the range and nothing beyond it", () => {
    expect(findTarget([node("tree-0001", 3, 0)], all, { x: 0, z: 0 }, 3)).not.toBeNull();
    expect(findTarget([node("tree-0001", 3.01, 0)], all, { x: 0, z: 0 }, 3)).toBeNull();
  });
});

describe("Targeting", () => {
  it("marks the target and clears it once the node is depleted", () => {
    const first = fixtureWorld.resourceNodes[0]!;
    const layer = new ResourceNodeLayer(fixtureWorld.resourceNodes);
    const targeting = new Targeting(fixtureWorld.resourceNodes, layer, 3);
    const standingNextTo = { x: first.position.x + 1, z: first.position.z };

    targeting.update(0.016, standingNextTo);
    expect(targeting.current()).toBe(first.resourceId);
    expect(targeting.marker.visible).toBe(true);

    layer.gathered(first.resourceId, 0);
    targeting.update(0.016, standingNextTo);
    expect(targeting.current()).not.toBe(first.resourceId);
  });
});
