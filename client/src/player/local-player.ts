import type { Object3D } from "three";
import type { Island, SpawnPoint } from "../shared/contracts/world";
import { sampleHeight } from "../world/terrain";
import { applyMouse, type Orbit } from "./follow-camera";
import type { PlayerInput } from "./input";
import { moveDirection, step, turnToward, yawOf } from "./movement";

const WALK_SPEED = 5;
const TURN_SPEED = 10;

export type PlayerAnimation = "idle" | "walk";

// What the networking track sends as PLAYER_MOVE.
export interface PlayerPose {
  position: { x: number; y: number; z: number };
  yaw: number;
  animation: PlayerAnimation;
}

export class LocalPlayer {
  orbit: Orbit;
  private pose: PlayerPose;

  constructor(
    private readonly island: Island,
    spawn: SpawnPoint,
    private readonly avatar: Object3D,
  ) {
    const { x, z } = spawn.position;
    this.pose = {
      position: { x, y: sampleHeight(island, x, z), z },
      yaw: spawn.yaw,
      animation: "idle",
    };
    this.orbit = { yaw: spawn.yaw, pitch: 0.45, distance: 9 };
    this.syncAvatar();
  }

  update(deltaSeconds: number, input: PlayerInput): void {
    const mouse = input.takeMouseDelta();
    this.orbit = applyMouse(this.orbit, mouse.x, mouse.y);

    const direction = moveDirection(input.moveIntent(), this.orbit.yaw);
    const moving = direction.x !== 0 || direction.z !== 0;
    if (moving) {
      const next = step(this.island, this.pose.position, direction, WALK_SPEED * deltaSeconds);
      this.pose.position = { x: next.x, y: sampleHeight(this.island, next.x, next.z), z: next.z };
      this.pose.yaw = turnToward(this.pose.yaw, yawOf(direction), TURN_SPEED * deltaSeconds);
    }
    this.pose.animation = moving ? "walk" : "idle";
    this.syncAvatar();
  }

  current(): PlayerPose {
    return { ...this.pose, position: { ...this.pose.position } };
  }

  private syncAvatar(): void {
    const { x, y, z } = this.pose.position;
    this.avatar.position.set(x, y, z);
    this.avatar.rotation.y = this.pose.yaw;
  }
}
