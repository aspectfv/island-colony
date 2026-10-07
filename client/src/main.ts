import { createWorldView, fitToWindow, startRenderLoop } from "./world/view";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Missing #game canvas");

const view = createWorldView(canvas);
fitToWindow(view);
window.addEventListener("resize", () => fitToWindow(view));
startRenderLoop(view);
