import { Mesh, MeshBasicMaterial, RingGeometry, type Object3D } from "three";
import type { ResourceNode } from "../shared/contracts/world";
import type { ResourceNodeLayer } from "../world/resource-nodes";

interface GroundPoint {
  x: number;
  z: number;
}

// Nearest available node within range, by ground distance, the same measure the host uses.
// No slack here: the client only offers gathers the host is sure to accept.
export function findTarget(
  nodes: ResourceNode[],
  isAvailable: (resourceId: string) => boolean,
  player: GroundPoint,
  range: number,
): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestDistance = range;
  for (const node of nodes) {
    const distance = Math.hypot(node.position.x - player.x, node.position.z - player.z);
    if (distance <= bestDistance && isAvailable(node.resourceId)) {
      best = node;
      bestDistance = distance;
    }
  }
  return best;
}

// Tracks the gatherable node in front of the player and marks it with a ring on the ground.
export class Targeting {
  readonly marker: Object3D;
  private target: ResourceNode | null = null;
  private elapsed = 0;
  private readonly material = new MeshBasicMaterial({
    color: 0xfff3b0,
    transparent: true,
    depthWrite: false,
  });

  constructor(
    private readonly nodes: ResourceNode[],
    private readonly layer: ResourceNodeLayer,
    private readonly range: number,
  ) {
    const ring = new Mesh(new RingGeometry(1.1, 1.35, 32), this.material);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.name = "target-marker";
    this.marker = ring;
  }

  // The targeted resourceId, or null. Gameplay sends GATHER_RESOURCE for this; the HUD prompts on it.
  current(): string | null {
    return this.target?.resourceId ?? null;
  }

  update(deltaSeconds: number, player: GroundPoint): void {
    this.target = findTarget(this.nodes, (id) => this.layer.isAvailable(id), player, this.range);
    this.marker.visible = this.target !== null;
    if (!this.target) return;
    const { x, y, z } = this.target.position;
    this.marker.position.set(x, y + 0.06, z);
    this.marker.scale.setScalar(this.target.scale);
    this.elapsed += deltaSeconds;
    this.material.opacity = 0.65 + Math.sin(this.elapsed * 5) * 0.25;
  }
}
