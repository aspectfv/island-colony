import type { MoveIntent } from "./movement";

const FORWARD = new Set(["KeyW", "ArrowUp"]);
const BACK = new Set(["KeyS", "ArrowDown"]);
const LEFT = new Set(["KeyA", "ArrowLeft"]);
const RIGHT = new Set(["KeyD", "ArrowRight"]);

// Keyboard movement and pointer-locked mouse look. Click the canvas to capture the mouse; Esc releases it.
export class PlayerInput {
  private readonly pressed = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (event) => this.pressed.add(event.code));
    window.addEventListener("keyup", (event) => this.pressed.delete(event.code));
    window.addEventListener("blur", () => this.pressed.clear());
    canvas.addEventListener("click", () => {
      if (document.pointerLockElement !== canvas) void canvas.requestPointerLock();
    });
    document.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.mouseX += event.movementX;
      this.mouseY += event.movementY;
    });
  }

  moveIntent(): MoveIntent {
    const held = (keys: Set<string>) => [...keys].some((key) => this.pressed.has(key));
    return {
      forward: (held(FORWARD) ? 1 : 0) - (held(BACK) ? 1 : 0),
      right: (held(RIGHT) ? 1 : 0) - (held(LEFT) ? 1 : 0),
    };
  }

  // Mouse movement since the last call.
  takeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseX, y: this.mouseY };
    this.mouseX = 0;
    this.mouseY = 0;
    return delta;
  }
}
