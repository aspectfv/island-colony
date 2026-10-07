// Reference terrain sampler. Clients and services must produce the same heights.
// Bilinear interpolation over the heightmap, with positions clamped to the map.

/**
 * @param {{ size: number, resolution: number, heights: number[] }} island
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
export function sampleHeight(island, x, z) {
  const { size, resolution, heights } = island;
  const cell = size / (resolution - 1);
  const clamp = (v) => Math.min(Math.max(v, 0), resolution - 1);
  const fx = clamp((x + size / 2) / cell);
  const fz = clamp((z + size / 2) / cell);
  const c0 = Math.min(Math.floor(fx), resolution - 2);
  const r0 = Math.min(Math.floor(fz), resolution - 2);
  const tx = fx - c0;
  const tz = fz - r0;
  const h = (r, c) => heights[r * resolution + c];
  const top = h(r0, c0) * (1 - tx) + h(r0, c0 + 1) * tx;
  const bottom = h(r0 + 1, c0) * (1 - tx) + h(r0 + 1, c0 + 1) * tx;
  return top * (1 - tz) + bottom * tz;
}
