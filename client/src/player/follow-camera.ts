import type { PerspectiveCamera } from "three";
import type { Island } from "../shared/contracts/world";
import { sampleHeight } from "../world/terrain";
import { forwardOf } from "./movement";

export interface Orbit {
  yaw: number;
  pitch: number;
  distance: number;
}

export const MIN_PITCH = 0.12;
export const MAX_PITCH = 1.25;
const SENSITIVITY = 0.0025;
const TARGET_HEIGHT = 1.6;
const GROUND_CLEARANCE = 0.5;

export function applyMouse(orbit: Orbit, deltaX: number, deltaY: number): Orbit {
  return {
    ...orbit,
    yaw: orbit.yaw - deltaX * SENSITIVITY,
    pitch: Math.min(MAX_PITCH, Math.max(MIN_PITCH, orbit.pitch + deltaY * SENSITIVITY)),
  };
}

// Camera sits behind the target (opposite its yaw's forward) and above it by the pitch angle.
export function cameraPosition(
  island: Island,
  target: { x: number; y: number; z: number },
  orbit: Orbit,
): { x: number; y: number; z: number } {
  const forward = forwardOf(orbit.yaw);
  const horizontal = Math.cos(orbit.pitch) * orbit.distance;
  const x = target.x - forward.x * horizontal;
  const z = target.z - forward.z * horizontal;
  const y = target.y + TARGET_HEIGHT + Math.sin(orbit.pitch) * orbit.distance;
  const floor = Math.max(sampleHeight(island, x, z), island.waterLevel) + GROUND_CLEARANCE;
  return { x, y: Math.max(y, floor), z };
}

export function placeCamera(
  camera: PerspectiveCamera,
  island: Island,
  target: { x: number; y: number; z: number },
  orbit: Orbit,
): void {
  const position = cameraPosition(island, target, orbit);
  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(target.x, target.y + TARGET_HEIGHT, target.z);
}
