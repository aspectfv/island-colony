import { describe, expect, it } from "vitest";
import fixture from "../../../contracts/examples/world/WorldConfig.json";
import type { Contribution, HostToPeerGameMessage } from "../shared/contracts/gameplay";
import type { WorldConfig } from "../shared/contracts/world";
import { RulesEngine } from "./rules-engine";

const fixtureWorld = fixture as unknown as WorldConfig;
const HOST = "3f6c2a1e-8b4d-4c2e-9a71-0d5e2b7c4f10";
const PEER = "9b1e7d42-5c3a-4f8e-b6d0-2a4c8e1f3b57";

function createEngine(now = 1_000_000) {
  let currentTime = now;
  const engine = new RulesEngine({
    world: fixtureWorld,
    sessionId: "6a2e9c4b-1f7d-4b83-a5e0-8c3d7f2b9e16",
    hostPlayer: { playerId: HOST, displayName: "HostUser" },
    now: () => currentTime,
  });

  return {
    engine,
    advanceTime: (ms: number) => {
      currentTime += ms;
    },
  };
}

describe("RulesEngine - GATHER_RESOURCE Validation Order", () => {
  it("rejects SESSION_NOT_ACTIVE when session is not active", () => {
    const { engine } = createEngine();
    (engine as unknown as { state: { status: string } }).state.status = "COMPLETED";

    const res = engine.gatherResource(HOST, "req-1", "tree-0001");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("SESSION_NOT_ACTIVE");
  });

  it("rejects PLAYER_NOT_READY if peer has not sent CLIENT_READY", () => {
    const { engine } = createEngine();
    engine.addPlayer({
      playerId: PEER,
      displayName: "PeerUser",
      slot: 1,
      position: { x: 0, y: 0, z: 0 },
      yaw: 0,
    });

    const res = engine.gatherResource(PEER, "req-1", "tree-0001");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("PLAYER_NOT_READY");
  });

  it("rejects DUPLICATE_REQUEST if requestId is reused by same player", () => {
    const { engine, advanceTime } = createEngine();
    const tree = fixtureWorld.resourceNodes.find((n) => n.nodeType === "tree")!;
    engine.updatePlayerPosition(HOST, { x: tree.position.x, z: tree.position.z });

    const first = engine.gatherResource(HOST, "req-dup", tree.resourceId);
    expect(first.ok).toBe(true);

    advanceTime(2000);
    const second = engine.gatherResource(HOST, "req-dup", tree.resourceId);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.rejection.code).toBe("DUPLICATE_REQUEST");
  });

  it("rejects RESOURCE_NOT_FOUND if resourceId does not exist", () => {
    const { engine } = createEngine();
    const res = engine.gatherResource(HOST, "req-1", "tree-non-existent");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("rejects RESOURCE_DEPLETED if node charges are exhausted", () => {
    const { engine, advanceTime } = createEngine();
    const tree = fixtureWorld.resourceNodes.find((n) => n.nodeType === "tree")!;
    engine.updatePlayerPosition(HOST, { x: tree.position.x, z: tree.position.z });

    const treeDef = fixtureWorld.rules.nodeTypes.find((t) => t.nodeType === "tree")!;
    for (let i = 0; i < treeDef.charges; i++) {
      advanceTime(1000);
      const res = engine.gatherResource(HOST, `req-${i}`, tree.resourceId);
      expect(res.ok).toBe(true);
    }

    advanceTime(1000);
    const depletedRes = engine.gatherResource(HOST, "req-depleted", tree.resourceId);
    expect(depletedRes.ok).toBe(false);
    if (!depletedRes.ok) expect(depletedRes.rejection.code).toBe("RESOURCE_DEPLETED");
  });

  it("rejects OUT_OF_RANGE if player is too far from node", () => {
    const { engine } = createEngine();
    const tree = fixtureWorld.resourceNodes.find((n) => n.nodeType === "tree")!;
    engine.updatePlayerPosition(HOST, {
      x: tree.position.x + 100,
      z: tree.position.z + 100,
    });

    const res = engine.gatherResource(HOST, "req-range", tree.resourceId);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("OUT_OF_RANGE");
  });

  it("rejects ON_COOLDOWN if requested faster than cooldownMs", () => {
    const { engine, advanceTime } = createEngine();
    const tree = fixtureWorld.resourceNodes.find((n) => n.nodeType === "tree")!;
    engine.updatePlayerPosition(HOST, { x: tree.position.x, z: tree.position.z });

    const first = engine.gatherResource(HOST, "req-1", tree.resourceId);
    expect(first.ok).toBe(true);

    advanceTime(fixtureWorld.rules.gathering.cooldownMs - 50);
    const fast = engine.gatherResource(HOST, "req-2", tree.resourceId);
    expect(fast.ok).toBe(false);
    if (!fast.ok) expect(fast.rejection.code).toBe("ON_COOLDOWN");
  });
});

describe("RulesEngine - PLACE_BUILDING Validation Order", () => {
  it("rejects SESSION_NOT_ACTIVE when session is not active", () => {
    const { engine } = createEngine();
    (engine as unknown as { state: { status: string } }).state.status = "COMPLETED";

    const res = engine.placeBuilding(HOST, "req-1", "camp", { x: 0, z: 0 }, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("SESSION_NOT_ACTIVE");
  });

  it("rejects PLAYER_NOT_READY if peer is not ready", () => {
    const { engine } = createEngine();
    engine.addPlayer({
      playerId: PEER,
      displayName: "PeerUser",
      slot: 1,
      position: { x: 0, y: 0, z: 0 },
      yaw: 0,
    });

    const res = engine.placeBuilding(PEER, "req-1", "camp", { x: 0, z: 0 }, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("PLAYER_NOT_READY");
  });

  it("rejects STRUCTURE_NOT_AVAILABLE if structureType is not the current BUILD objective", () => {
    const { engine } = createEngine();
    // Objective 0 is GATHER "gather-basics", not a BUILD objective
    const res = engine.placeBuilding(HOST, "req-1", "camp", { x: 0, z: 0 }, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("STRUCTURE_NOT_AVAILABLE");
  });

  it("rejects INSUFFICIENT_RESOURCES when player cannot afford structure", () => {
    const { engine } = createEngine();
    (engine as unknown as { state: { objectiveIndex: number } }).state.objectiveIndex = 1;

    const res = engine.placeBuilding(HOST, "req-1", "camp", { x: 0, z: 0 }, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("INSUFFICIENT_RESOURCES");
  });

  it("rejects OUT_OF_RANGE if structure is placed beyond building.placementRange", () => {
    const { engine } = createEngine();
    (engine as unknown as { state: { objectiveIndex: number } }).state.objectiveIndex = 1;
    (engine as unknown as { state: { resources: Record<string, number> } }).state.resources = {
      wood: 100,
      stone: 100,
    };
    engine.updatePlayerPosition(HOST, { x: 0, z: 0 });

    const res = engine.placeBuilding(HOST, "req-1", "camp", { x: 50, z: 50 }, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("OUT_OF_RANGE");
  });

  it("rejects INVALID_PLACEMENT if footprint exceeds build zone bounds", () => {
    const { engine } = createEngine();
    (engine as unknown as { state: { objectiveIndex: number } }).state.objectiveIndex = 1;
    (engine as unknown as { state: { resources: Record<string, number> } }).state.resources = {
      wood: 100,
      stone: 100,
    };

    const zone1 = fixtureWorld.buildZones[0]!;
    const edgeX = zone1.center.x + zone1.radius - 1;
    engine.updatePlayerPosition(HOST, { x: edgeX, z: zone1.center.z });

    const res = engine.placeBuilding(HOST, "req-1", "camp", { x: edgeX, z: zone1.center.z }, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rejection.code).toBe("INVALID_PLACEMENT");
  });

  it("rejects INVALID_PLACEMENT if footprint overlaps an existing placed structure", () => {
    const { engine } = createEngine();
    (engine as unknown as { state: { objectiveIndex: number } }).state.objectiveIndex = 1;
    (engine as unknown as { state: { resources: Record<string, number> } }).state.resources = {
      wood: 100,
      stone: 100,
    };

    const zone1 = fixtureWorld.buildZones[0]!;
    engine.updatePlayerPosition(HOST, { x: zone1.center.x, z: zone1.center.z });

    const first = engine.placeBuilding(
      HOST,
      "req-1",
      "camp",
      { x: zone1.center.x, z: zone1.center.z },
      0,
    );
    expect(first.ok).toBe(true);

    // Set objective back to build-camp to test collision
    (engine as unknown as { state: { objectiveIndex: number } }).state.objectiveIndex = 1;
    const overlap = engine.placeBuilding(
      HOST,
      "req-2",
      "camp",
      { x: zone1.center.x + 1, z: zone1.center.z },
      0,
    );
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) expect(overlap.rejection.code).toBe("INVALID_PLACEMENT");
  });
});

describe("RulesEngine - Full Playthrough on Fixture Island", () => {
  it("plays through every objective and completes session with valid SessionSummary", () => {
    const { engine, advanceTime } = createEngine();
    let reqId = 100;

    const gatherUntil = (resourceType: "wood" | "stone", targetAmount: number) => {
      const nodeType = resourceType === "wood" ? "tree" : "rock";
      const nodes = fixtureWorld.resourceNodes.filter((n) => n.nodeType === nodeType);

      for (const node of nodes) {
        engine.updatePlayerPosition(HOST, { x: node.position.x, z: node.position.z });
        while (engine.getState().nodeCharges[node.resourceId] !== 0) {
          if ((engine.getState().resources[resourceType] ?? 0) >= targetAmount) {
            return;
          }
          advanceTime(1000);
          const res = engine.gatherResource(HOST, `req-${reqId++}`, node.resourceId);
          expect(res.ok).toBe(true);
        }
      }
    };

    // Objective 0: GATHER "gather-basics": 20 wood, 5 stone
    expect(engine.getState().objectiveIndex).toBe(0);
    gatherUntil("wood", 20);
    gatherUntil("stone", 5);

    // Cascaded to Objective 1: BUILD "build-camp"
    expect(engine.getState().objectiveIndex).toBe(1);

    // Gather extra for camp cost: 20 wood, 5 stone
    gatherUntil("wood", 20);
    gatherUntil("stone", 5);

    // Place camp in zone 1 center (0, 0)
    engine.updatePlayerPosition(HOST, { x: 0, z: 0 });
    const campRes = engine.placeBuilding(HOST, `req-${reqId++}`, "camp", { x: 0, z: 0 }, 0);
    expect(campRes.ok).toBe(true);
    if (campRes.ok) {
      expect(
        campRes.events.some((e: HostToPeerGameMessage) => e.type === "OBJECTIVE_UPDATED"),
      ).toBe(true);
    }

    // Objective 2: BUILD "build-storage-hut" (cost: 40 wood, 20 stone)
    expect(engine.getState().objectiveIndex).toBe(2);
    gatherUntil("wood", 40);
    gatherUntil("stone", 20);

    // Place storage hut in zone 1 at offset (7, 0)
    engine.updatePlayerPosition(HOST, { x: 7, z: 0 });
    const hutRes = engine.placeBuilding(HOST, `req-${reqId++}`, "storage-hut", { x: 7, z: 0 }, 0);
    expect(hutRes.ok).toBe(true);

    // Objective 3: BUILD "build-signal-beacon" (cost: 60 wood, 45 stone)
    expect(engine.getState().objectiveIndex).toBe(3);
    gatherUntil("wood", 60);
    gatherUntil("stone", 45);

    // Place signal beacon in zone 2 (center 22, 14)
    const zone2 = fixtureWorld.buildZones[1]!;
    engine.updatePlayerPosition(HOST, { x: zone2.center.x, z: 14 });
    const beaconRes = engine.placeBuilding(
      HOST,
      `req-${reqId++}`,
      "signal-beacon",
      { x: zone2.center.x, z: 14 },
      0,
    );
    expect(beaconRes.ok).toBe(true);

    // Finished all objectives!
    expect(beaconRes.ok).toBe(true);
    if (!beaconRes.ok) return;

    const completedEvent = beaconRes.events.find(
      (e: HostToPeerGameMessage) => e.type === "SESSION_COMPLETED",
    );
    expect(completedEvent).toBeDefined();
    expect(engine.getState().status).toBe("COMPLETED");

    // Verify SessionSummary invariants match contracts
    if (completedEvent && completedEvent.type === "SESSION_COMPLETED") {
      const summary = completedEvent.summary;
      expect(summary.outcome).toBe("COMPLETED");
      expect(summary.objectivesCompleted).toBe(4);
      expect(summary.structures).toHaveLength(3);

      const placedSum = summary.contributions.reduce(
        (acc: number, c: Contribution) => acc + c.structuresPlaced,
        0,
      );
      expect(placedSum).toBe(summary.structures.length);

      for (const res of fixtureWorld.rules.resources) {
        const contribSum = summary.contributions.reduce(
          (acc: number, c: Contribution) => acc + (c.gathered[res.resourceType] ?? 0),
          0,
        );
        expect(contribSum).toBe(summary.totalGathered[res.resourceType] ?? 0);
      }
    }
  });
});
