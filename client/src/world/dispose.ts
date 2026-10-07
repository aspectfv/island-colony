import type { Material, Object3D } from "three";

// Frees the GPU buffers of every geometry and material under root. Shared geometries and
// materials are safe to dispose: three.js uploads them again the next time they are drawn.
export function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    const { geometry, material } = object as Object3D & {
      geometry?: { dispose(): void };
      material?: Material | Material[];
    };
    geometry?.dispose();
    for (const each of Array.isArray(material) ? material : material ? [material] : []) {
      each.dispose();
    }
  });
}
