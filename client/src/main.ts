import { createAvatar } from "./player/avatar";
import { placeCamera } from "./player/follow-camera";
import { PlayerInput } from "./player/input";
import { LocalPlayer } from "./player/local-player";
import { fixtureWorld } from "./shared/fixture-world";
import { createIsland } from "./world/island";
import { createWorldView, fitToWindow, startRenderLoop } from "./world/view";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Missing #game canvas");

const slot = 0;
const spawn = fixtureWorld.spawnPoints[slot];
if (!spawn) throw new Error(`World has no spawn point for slot ${slot}`);

const view = createWorldView(canvas);
view.scene.add(createIsland(fixtureWorld));
const avatar = createAvatar(slot);
view.scene.add(avatar);

const input = new PlayerInput(canvas);
const player = new LocalPlayer(fixtureWorld.island, spawn, avatar);

fitToWindow(view);
window.addEventListener("resize", () => fitToWindow(view));
startRenderLoop(view, (deltaSeconds) => {
  player.update(deltaSeconds, input);
  placeCamera(view.camera, fixtureWorld.island, player.current().position, player.orbit);
});
