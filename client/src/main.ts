import { GameView } from "./game-view";
import { PlayerInput } from "./player/input";
import { getServices } from "./services";
import type { WorldConfig } from "./shared/contracts/world";
import { fixtureWorld } from "./shared/fixture-world";
import { UIManager, type ScreenState } from "./ui";
import { CloudLayer } from "./world/clouds";
import { createWorldView, fitToWindow, startRenderLoop } from "./world/view";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Missing #game canvas");

const view = createWorldView(canvas);
const game = new GameView(view.scene, view.camera);
const input = new PlayerInput(canvas);
const frameTasks: Array<(deltaSeconds: number) => void> = [];
const params = new URLSearchParams(location.search);

// Floating clouds layer
const cloudLayer = new CloudLayer(160, 14);
view.scene.add(cloudLayer.group);

let currentScreenState: ScreenState = "MENU";
let scenicAngle = 0;
const SCENIC_RADIUS = 165;
const SCENIC_HEIGHT = 105;
const SCENIC_ROTATION_SPEED = 0.055; // Gentle, smooth rotation (radians/sec)

input.enabled = false;

async function startSessionGame(world: WorldConfig, slot: number): Promise<void> {
  currentScreenState = "GAME";
  const active = game.enter(world, slot);
  input.enabled = true;

  if (import.meta.env.DEV && params.has("demo")) {
    const { startDemo } = await import("./dev/demo");
    startDemo({
      world,
      structures: active.world.structures,
      resourceNodes: active.world.resourceNodes,
      remoteAvatars: game.remoteAvatars,
      onFrame: (task) => frameTasks.push(task),
    });
  }
}

async function init(): Promise<void> {
  const initialWorld: WorldConfig =
    import.meta.env.DEV && params.get("world") === "minimal"
      ? ((await import("../../contracts/examples/world/WorldConfig.minimal.json"))
          .default as unknown as WorldConfig)
      : fixtureWorld;

  // Background scenic render while in menus
  game.enter(initialWorld, 0);

  if (import.meta.env.DEV && (params.has("demo") || params.has("skip-menu"))) {
    void startSessionGame(initialWorld, 0);
  } else {
    const services = getServices();
    new UIManager(
      services,
      (payload) => {
        const world = (payload.sessionDetails?.worldConfig as WorldConfig) || initialWorld;
        void startSessionGame(world, payload.slot);
      },
      (screen) => {
        currentScreenState = screen;
      },
    );
  }
}

if (import.meta.env.DEV && params.has("stats")) {
  void import("./dev/stats").then(({ startStats }) => frameTasks.push(startStats(view.renderer)));
}

fitToWindow(view);
window.addEventListener("resize", () => fitToWindow(view));
void init();

startRenderLoop(view, (deltaSeconds) => {
  cloudLayer.update(deltaSeconds);

  if (currentScreenState === "GAME") {
    game.update(deltaSeconds, input);
  } else {
    // In MENU or LOBBY: gentle isometric rotating camera around the island
    scenicAngle += SCENIC_ROTATION_SPEED * deltaSeconds;
    view.camera.position.set(
      Math.cos(scenicAngle) * SCENIC_RADIUS,
      SCENIC_HEIGHT,
      Math.sin(scenicAngle) * SCENIC_RADIUS,
    );
    view.camera.lookAt(0, 8, 0);
  }

  for (const task of frameTasks) task(deltaSeconds);
});
