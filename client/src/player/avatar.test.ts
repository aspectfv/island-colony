import { describe, expect, it } from "vitest";
import { animateAvatar, createAvatar } from "./avatar";

describe("animateAvatar", () => {
  it("bobs the rig while walking and keeps the avatar root still", () => {
    const avatar = createAvatar(0);
    animateAvatar(avatar, "walk", 0.1);

    expect(avatar.getObjectByName("rig")?.position.y).toBeGreaterThan(0);
    expect(avatar.position.y).toBe(0);
  });

  it("settles when idle, and treats unknown animations as idle", () => {
    const avatar = createAvatar(0);
    animateAvatar(avatar, "walk", 0.1);
    animateAvatar(avatar, "dance", 0.2);

    expect(avatar.getObjectByName("rig")?.position.y).toBe(0);
    expect(avatar.getObjectByName("rig")?.rotation.z).toBe(0);
  });
});
