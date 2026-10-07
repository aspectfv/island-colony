import type { Object3D, PerspectiveCamera } from "three";
import { animateAvatar, createAvatar } from "./player/avatar";
import { placeCamera } from "./player/follow-camera";
import type { PlayerInput } from "./player/input";
import { LocalPlayer } from "./player/local-player";
import { RemoteAvatars } from "./player/remote-avatars";
import { spawnPointFor } from "./player/spawn";
import { Targeting } from "./player/targeting";
import type { WorldConfig } from "./shared/contracts/world";
import { WorldScene, type LoadedWorld } from "./world/world-scene";

export interface ActiveWorld {
  world: LoadedWorld;
  player: LocalPlayer;
  targeting: Targeting;
}

// The scene for whichever world the local player is in. enter() is called once per session with
// the world config from SessionDetails (or the fixture in local mode) and the player's slot.
export class GameView {
  readonly remoteAvatars = new RemoteAvatars();
  private readonly worldScene: WorldScene;
  private active: ActiveWorld | null = null;
  private avatar: Object3D | null = null;

  constructor(
    private readonly scene: Object3D,
    private readonly camera: PerspectiveCamera,
  ) {
    this.worldScene = new WorldScene(scene);
    scene.add(this.remoteAvatars.group);
  }

  enter(config: WorldConfig, slot: number): ActiveWorld {
    const world = this.worldScene.load(config);
    this.remoteAvatars.clear();
    if (this.active) this.scene.remove(this.active.targeting.marker);
    if (this.avatar) this.scene.remove(this.avatar);

    this.avatar = createAvatar(slot);
    this.scene.add(this.avatar);
    const targeting = new Targeting(
      config.resourceNodes,
      world.resourceNodes,
      config.rules.gathering.interactionRange,
    );
    this.scene.add(targeting.marker);
    const player = new LocalPlayer(config.island, spawnPointFor(config, slot), this.avatar);

    this.active = { world, player, targeting };
    return this.active;
  }

  current(): ActiveWorld | null {
    return this.active;
  }

  update(deltaSeconds: number, input: PlayerInput): void {
    if (!this.active || !this.avatar) return;
    const { world, player, targeting } = this.active;
    player.update(deltaSeconds, input);
    const pose = player.current();
    animateAvatar(this.avatar, pose.animation, performance.now() / 1000);
    world.resourceNodes.update(deltaSeconds);
    targeting.update(deltaSeconds, pose.position);
    this.remoteAvatars.update(performance.now());
    placeCamera(this.camera, world.config.island, pose.position, player.orbit);
  }
}
