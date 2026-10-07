// Development-only frame stats. Open the client with ?stats to show frames per second, draw calls
// and triangles in the corner. Never imported in production builds.
import type { WebGLRenderer } from "three";

export function startStats(renderer: WebGLRenderer): (deltaSeconds: number) => void {
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;top:8px;left:8px;padding:4px 8px;font:12px monospace;color:#fff;background:rgba(0,0,0,.55);border-radius:4px;pointer-events:none";
  document.body.append(panel);
  let frames = 0;
  let elapsed = 0;
  return (deltaSeconds) => {
    frames += 1;
    elapsed += deltaSeconds;
    if (elapsed < 0.5) return;
    const { calls, triangles } = renderer.info.render;
    panel.textContent = `${Math.round(frames / elapsed)} fps · ${calls} draw calls · ${triangles} triangles`;
    frames = 0;
    elapsed = 0;
  };
}
