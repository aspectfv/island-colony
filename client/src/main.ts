import { animateAvatar, createAvatar } from "./player/avatar";
import { placeCamera } from "./player/follow-camera";
import { PlayerInput } from "./player/input";
import { LocalPlayer } from "./player/local-player";
import { RemoteAvatars } from "./player/remote-avatars";
import { Targeting } from "./player/targeting";
import { fixtureWorld } from "./shared/fixture-world";
import { createIsland } from "./world/island";
import { ResourceNodeLayer } from "./world/resource-nodes";
import { StructureLayer } from "./world/structures";
import { createWorldView, fitToWindow, startRenderLoop } from "./world/view";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Missing #game canvas");

const slot = 0;
const spawn = fixtureWorld.spawnPoints[slot];
if (!spawn) throw new Error(`World has no spawn point for slot ${slot}`);

const view = createWorldView(canvas);
view.scene.add(createIsland(fixtureWorld));
const resourceNodes = new ResourceNodeLayer(fixtureWorld.resourceNodes);
view.scene.add(resourceNodes.group);
const structures = new StructureLayer(fixtureWorld.island);
view.scene.add(structures.group);
const avatar = createAvatar(slot);
view.scene.add(avatar);
const remoteAvatars = new RemoteAvatars();
view.scene.add(remoteAvatars.group);

const targeting = new Targeting(
  fixtureWorld.resourceNodes,
  resourceNodes,
  fixtureWorld.rules.gathering.interactionRange,
);
view.scene.add(targeting.marker);

const input = new PlayerInput(canvas);
const player = new LocalPlayer(fixtureWorld.island, spawn, avatar);

const frameTasks: Array<(deltaSeconds: number) => void> = [];
if (import.meta.env.DEV && new URLSearchParams(location.search).has("demo")) {
  void import("./dev/demo").then(({ startDemo }) =>
    startDemo({
      world: fixtureWorld,
      structures,
      resourceNodes,
      remoteAvatars,
      onFrame: (task) => frameTasks.push(task),
    }),
  );
}

if (import.meta.env.DEV && new URLSearchParams(location.search).has("stats")) {
  void import("./dev/stats").then(({ startStats }) => frameTasks.push(startStats(view.renderer)));
}

fitToWindow(view);
window.addEventListener("resize", () => fitToWindow(view));
startRenderLoop(view, (deltaSeconds) => {
  player.update(deltaSeconds, input);
  animateAvatar(avatar, player.current().animation, performance.now() / 1000);
  resourceNodes.update(deltaSeconds);
  targeting.update(deltaSeconds, player.current().position);
  remoteAvatars.update(performance.now());
  for (const task of frameTasks) task(deltaSeconds);
  placeCamera(view.camera, fixtureWorld.island, player.current().position, player.orbit);
});
