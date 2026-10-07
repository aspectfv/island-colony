import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
} from "three";

export interface WorldView {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
}

export function createWorldView(canvas: HTMLCanvasElement): WorldView {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = new Color(0x9fd4f0);
  scene.fog = new Fog(0x9fd4f0, 250, 700);
  scene.add(new HemisphereLight(0xdff3ff, 0x5a7d3a, 1.2));
  const sun = new DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(60, 120, 40);
  // One shadow map over the whole island: about 10 cm per texel, enough for low-poly shapes.
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -110,
    right: 110,
    top: 110,
    bottom: -110,
    near: 1,
    far: 320,
  });
  sun.shadow.normalBias = 0.05;
  scene.add(sun);

  const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 110, 150);
  camera.lookAt(0, 0, 0);

  return { renderer, scene, camera };
}

export function resizeCamera(camera: PerspectiveCamera, width: number, height: number): void {
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

export function fitToWindow(view: WorldView): void {
  view.renderer.setSize(window.innerWidth, window.innerHeight, false);
  resizeCamera(view.camera, window.innerWidth, window.innerHeight);
}

// Longest frame step we simulate, so a backgrounded tab does not teleport the player on return.
const MAX_FRAME_SECONDS = 0.1;

export function startRenderLoop(view: WorldView, onFrame: (deltaSeconds: number) => void): void {
  const timer = new Timer();
  view.renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    onFrame(Math.min(timer.getDelta(), MAX_FRAME_SECONDS));
    view.renderer.render(view.scene, view.camera);
  });
}
