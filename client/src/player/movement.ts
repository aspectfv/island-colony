import type { Island } from "../shared/contracts/world";
import { sampleHeight } from "../world/terrain";

export interface MoveIntent {
  // -1 to 1. Positive forward is away from the camera, positive right is to the camera's right.
  forward: number;
  right: number;
}

export interface GroundPoint {
  x: number;
  z: number;
}

// Unit vector a yaw faces on the ground plane. Yaw 0 faces -Z (contracts/docs/conventions.md).
export function forwardOf(yaw: number): GroundPoint {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function yawOf(direction: GroundPoint): number {
  return Math.atan2(-direction.x, -direction.z);
}

// Movement direction relative to the camera, normalized so diagonals are not faster.
export function moveDirection(intent: MoveIntent, cameraYaw: number): GroundPoint {
  const forward = forwardOf(cameraYaw);
  const right = { x: Math.cos(cameraYaw), z: -Math.sin(cameraYaw) };
  const x = forward.x * intent.forward + right.x * intent.right;
  const z = forward.z * intent.forward + right.z * intent.right;
  const length = Math.hypot(x, z);
  return length === 0 ? { x: 0, z: 0 } : { x: x / length, z: z / length };
}

const SHORE_MARGIN = 0.15;

export function isWalkable(island: Island, point: GroundPoint): boolean {
  const half = island.size / 2;
  if (Math.abs(point.x) > half || Math.abs(point.z) > half) return false;
  return sampleHeight(island, point.x, point.z) > island.waterLevel + SHORE_MARGIN;
}

// Moves along the direction, sliding along the shoreline instead of stopping dead.
export function step(
  island: Island,
  from: GroundPoint,
  direction: GroundPoint,
  distance: number,
): GroundPoint {
  const candidates = [
    { x: from.x + direction.x * distance, z: from.z + direction.z * distance },
    { x: from.x + direction.x * distance, z: from.z },
    { x: from.x, z: from.z + direction.z * distance },
  ];
  return candidates.find((point) => isWalkable(island, point)) ?? from;
}

// Turns from one yaw toward another by at most maxStep radians, the short way round.
export function turnToward(current: number, target: number, maxStep: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  if (Math.abs(difference) <= maxStep) return target;
  const turned = current + Math.sign(difference) * maxStep;
  return Math.atan2(Math.sin(turned), Math.cos(turned));
}
