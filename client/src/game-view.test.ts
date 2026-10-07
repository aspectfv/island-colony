import { PerspectiveCamera, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import minimal from "../../contracts/examples/world/WorldConfig.minimal.json";
import { GameView } from "./game-view";
import type { WorldConfig } from "./shared/contracts/world";
import { fixtureWorld } from "./shared/fixture-world";

const minimalWorld = minimal as unknown as WorldConfig;
const setup = () => {
  const scene = new Scene();
  return { scene, game: new GameView(scene, new PerspectiveCamera()) };
};

describe("GameView", () => {
  it("puts the player at their slot's spawn point", () => {
    const { game } = setup();
    const { player } = game.enter(fixtureWorld, 2);
    const spawn = fixtureWorld.spawnPoints[2]!;

    expect(player.current().position.x).toBe(spawn.position.x);
    expect(player.current().position.z).toBe(spawn.position.z);
    expect(player.current().yaw).toBe(spawn.yaw);
  });

  it("replaces the previous world without leaving objects behind", () => {
    const { scene, game } = setup();
    game.enter(fixtureWorld, 0);
    const childCount = scene.children.length;

    const second = game.enter(minimalWorld, 1);

    expect(scene.children).toHaveLength(childCount);
    expect(scene.getObjectsByProperty("name", "world")).toHaveLength(1);
    expect(second.world.config).toBe(minimalWorld);
    expect(scene.getObjectByName(fixtureWorld.resourceNodes[5]!.resourceId)).toBeUndefined();
  });

  it("frees the previous world's GPU resources", () => {
    const { scene, game } = setup();
    game.enter(fixtureWorld, 0);
    const terrain = scene.getObjectByName("terrain") as unknown as {
      geometry: { dispose(): void };
    };
    const dispose = vi.spyOn(terrain.geometry, "dispose");

    game.enter(minimalWorld, 0);

    expect(dispose).toHaveBeenCalled();
  });

  it("clears remote players when entering a new world", () => {
    const { game } = setup();
    game.enter(fixtureWorld, 0);
    game.remoteAvatars.add("p2", 1);

    game.enter(minimalWorld, 0);

    expect(game.remoteAvatars.group.children).toHaveLength(0);
  });
});
