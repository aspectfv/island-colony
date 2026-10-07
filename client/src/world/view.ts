import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
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

  const scene = new Scene();
  scene.background = new Color(0x9fd4f0);
  scene.fog = new Fog(0x9fd4f0, 250, 700);
  scene.add(new HemisphereLight(0xdff3ff, 0x5a7d3a, 1.2));
  const sun = new DirectionalLight(0xffffff, 1.5);
  sun.position.set(40, 80, 30);
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

export function startRenderLoop(view: WorldView): void {
  view.renderer.setAnimationLoop(() => view.renderer.render(view.scene, view.camera));
}
