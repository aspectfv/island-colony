import { describe, expect, it } from "vitest";
import type { PlayerMoved } from "../shared/contracts/gameplay";
import { INTERPOLATION_DELAY_MS, RemoteAvatars, poseAt, type PoseSample } from "./remote-avatars";

const sample = (receivedAt: number, x: number, yaw = 0): PoseSample => ({
  receivedAt,
  x,
  y: 0,
  z: 0,
  yaw,
  animation: "walk",
});

const moved = (n: number, x: number): PlayerMoved => ({
  type: "PLAYER_MOVED",
  playerId: "p2",
  n,
  position: { x, y: 0, z: 0 },
  yaw: 0,
  animation: "walk",
});

describe("poseAt", () => {
  it("interpolates between the samples around the render time", () => {
    expect(poseAt([sample(0, 0), sample(100, 10)], 25)?.x).toBeCloseTo(2.5);
  });

  it("holds the last sample instead of extrapolating", () => {
    expect(poseAt([sample(0, 0), sample(100, 10)], 500)?.x).toBe(10);
  });

  it("turns the short way across the -PI/PI seam", () => {
    const yaw = poseAt([sample(0, 0, 3), sample(100, 0, -3)], 50)?.yaw ?? 0;
    expect(Math.abs(Math.atan2(Math.sin(yaw), Math.cos(yaw)))).toBeGreaterThan(3);
  });

  it("returns null with no samples", () => {
    expect(poseAt([], 0)).toBeNull();
  });
});

describe("RemoteAvatars", () => {
  it("drops movement that is not newer than the last received", () => {
    const avatars = new RemoteAvatars();
    avatars.add("p2", 1);
    avatars.receive(moved(5, 5), 0);
    avatars.receive(moved(4, 99), 10);
    avatars.update(1000);

    expect(avatars.group.children[0]?.position.x).toBe(5);
  });

  it("renders in the past, between the two latest updates", () => {
    const avatars = new RemoteAvatars();
    avatars.add("p2", 1);
    avatars.receive(moved(1, 0), 1000);
    avatars.receive(moved(2, 10), 1100);
    avatars.update(1050 + INTERPOLATION_DELAY_MS);

    expect(avatars.group.children[0]?.position.x).toBeCloseTo(5);
  });

  it("ignores movement for players it was not told about, and removes players", () => {
    const avatars = new RemoteAvatars();
    avatars.receive(moved(1, 0), 0);
    expect(avatars.group.children).toHaveLength(0);

    avatars.add("p2", 1);
    avatars.remove("p2");
    expect(avatars.group.children).toHaveLength(0);
  });
});
