import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshLambertMaterial } from "three";
import type { Island } from "../shared/contracts/world";

// Same algorithm as contracts/scripts/sample-height.mjs. Gameplay and placement depend on it.
export function sampleHeight(island: Island, x: number, z: number): number {
  const { size, resolution, heights } = island;
  const cell = size / (resolution - 1);
  const clamp = (v: number) => Math.min(Math.max(v, 0), resolution - 1);
  const fx = clamp((x + size / 2) / cell);
  const fz = clamp((z + size / 2) / cell);
  const c0 = Math.min(Math.floor(fx), resolution - 2);
  const r0 = Math.min(Math.floor(fz), resolution - 2);
  const tx = fx - c0;
  const tz = fz - r0;
  const h = (r: number, c: number) => heights[r * resolution + c] ?? 0;
  const top = h(r0, c0) * (1 - tx) + h(r0, c0 + 1) * tx;
  const bottom = h(r0 + 1, c0) * (1 - tx) + h(r0 + 1, c0 + 1) * tx;
  return top * (1 - tz) + bottom * tz;
}

const seabed = new Color(0xc9b27a);
const sand = new Color(0xe8d49a);
const grass = new Color(0x6fae4f);
const meadow = new Color(0x84bd5c);
const rock = new Color(0x9a958a);

function groundColor(height: number, waterLevel: number): Color {
  if (height <= waterLevel) return seabed;
  if (height <= waterLevel + 0.8) return sand;
  if (height >= 5.2) return rock;
  return height >= 2.6 ? meadow : grass;
}

// One vertex per heightmap sample, two triangles per cell, flat-shaded by the cell's mean height.
export function createTerrainMesh(island: Island): Mesh {
  const { size, resolution, heights, waterLevel } = island;
  const cell = size / (resolution - 1);
  const point = (row: number, col: number): [number, number, number] => [
    -size / 2 + col * cell,
    heights[row * resolution + col] ?? 0,
    -size / 2 + row * cell,
  ];

  const positions: number[] = [];
  const colors: number[] = [];
  const addTriangle = (a: number[], b: number[], c: number[]) => {
    positions.push(...a, ...b, ...c);
    const color = groundColor(((a[1] ?? 0) + (b[1] ?? 0) + (c[1] ?? 0)) / 3, waterLevel);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  };

  for (let row = 0; row < resolution - 1; row++) {
    for (let col = 0; col < resolution - 1; col++) {
      const nw = point(row, col);
      const ne = point(row, col + 1);
      const sw = point(row + 1, col);
      const se = point(row + 1, col + 1);
      addTriangle(nw, sw, ne);
      addTriangle(ne, sw, se);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new Mesh(
    geometry,
    new MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  );
  terrain.name = "terrain";
  terrain.receiveShadow = true;
  return terrain;
}
