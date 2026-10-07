import { GameView } from "./game-view";
import { PlayerInput } from "./player/input";
import type { WorldConfig } from "./shared/contracts/world";
import { fixtureWorld } from "./shared/fixture-world";
import { createWorldView, fitToWindow, startRenderLoop } from "./world/view";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Missing #game canvas");

const view = createWorldView(canvas);
const game = new GameView(view.scene, view.camera);
const input = new PlayerInput(canvas);
const frameTasks: Array<(deltaSeconds: number) => void> = [];
const params = new URLSearchParams(location.search);

async function startLocal(): Promise<void> {
  // ?world=minimal loads the tiny test world, to check that worlds other than the fixture render.
  const world: WorldConfig =
    import.meta.env.DEV && params.get("world") === "minimal"
      ? ((await import("../../contracts/examples/world/WorldConfig.minimal.json"))
          .default as unknown as WorldConfig)
      : fixtureWorld;
  const active = game.enter(world, 0);

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

if (import.meta.env.DEV && params.has("stats")) {
  void import("./dev/stats").then(({ startStats }) => frameTasks.push(startStats(view.renderer)));
}

fitToWindow(view);
window.addEventListener("resize", () => fitToWindow(view));
void startLocal();
startRenderLoop(view, (deltaSeconds) => {
  game.update(deltaSeconds, input);
  for (const task of frameTasks) task(deltaSeconds);
});
