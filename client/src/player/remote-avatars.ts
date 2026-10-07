import { Group } from "three";
import type { PlayerMoved } from "../shared/contracts/gameplay";
import { animateAvatar, createAvatar } from "./avatar";

export interface PoseSample {
  receivedAt: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  animation: string;
}

// Render remote players this far in the past so there is usually a newer sample to move toward.
export const INTERPOLATION_DELAY_MS = 100;
const BUFFER_MS = 1000;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

// Pose at renderTime from samples ordered by receivedAt. Holds the first or last sample outside the
// buffered range instead of extrapolating.
export function poseAt(samples: PoseSample[], renderTime: number): PoseSample | null {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return null;
  if (renderTime <= first.receivedAt) return first;
  if (renderTime >= last.receivedAt) return last;
  const nextIndex = samples.findIndex((sample) => sample.receivedAt > renderTime);
  const before = samples[nextIndex - 1]!;
  const after = samples[nextIndex]!;
  const t = (renderTime - before.receivedAt) / (after.receivedAt - before.receivedAt);
  return {
    receivedAt: renderTime,
    x: lerp(before.x, after.x, t),
    y: lerp(before.y, after.y, t),
    z: lerp(before.z, after.z, t),
    yaw: lerpAngle(before.yaw, after.yaw, t),
    animation: t < 0.5 ? before.animation : after.animation,
  };
}

interface RemotePlayer {
  avatar: Group;
  lastN: number;
  samples: PoseSample[];
}

// Other players' avatars, driven by PLAYER_MOVED. Players are added on PLAYER_JOINED (or from a
// snapshot) and removed on PLAYER_LEFT; movement for unknown players is ignored.
export class RemoteAvatars {
  readonly group = new Group();
  private readonly players = new Map<string, RemotePlayer>();

  constructor() {
    this.group.name = "remote-avatars";
  }

  add(playerId: string, slot: number): void {
    if (this.players.has(playerId)) return;
    const avatar = createAvatar(slot);
    avatar.visible = false;
    this.group.add(avatar);
    this.players.set(playerId, { avatar, lastN: 0, samples: [] });
  }

  remove(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    this.group.remove(player.avatar);
    this.players.delete(playerId);
  }

  // The movement channel is unordered: anything not newer than the last message is dropped.
  receive(message: PlayerMoved, receivedAt: number): void {
    const player = this.players.get(message.playerId);
    if (!player || message.n <= player.lastN) return;
    player.lastN = message.n;
    player.samples.push({
      receivedAt,
      ...message.position,
      yaw: message.yaw,
      animation: message.animation,
    });
    while (player.samples.length > 2 && player.samples[0]!.receivedAt < receivedAt - BUFFER_MS) {
      player.samples.shift();
    }
  }

  update(now: number): void {
    for (const player of this.players.values()) {
      const pose = poseAt(player.samples, now - INTERPOLATION_DELAY_MS);
      if (!pose) continue;
      player.avatar.visible = true;
      player.avatar.position.set(pose.x, pose.y, pose.z);
      player.avatar.rotation.y = pose.yaw;
      animateAvatar(player.avatar, pose.animation, now / 1000);
    }
  }
}
