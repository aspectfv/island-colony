import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from "three";
import type { ResourceNode } from "../shared/contracts/world";

const trunkGeometry = new CylinderGeometry(0.22, 0.3, 1.2, 6);
const crownGeometry = new ConeGeometry(1.1, 2.6, 7);
const rockGeometry = new DodecahedronGeometry(0.9);
const placeholderGeometry = new BoxGeometry(1, 1, 1);

const trunkMaterial = new MeshLambertMaterial({ color: 0x7a5233, flatShading: true });
const crownMaterial = new MeshLambertMaterial({ color: 0x3f8f3a, flatShading: true });
const rockMaterial = new MeshLambertMaterial({ color: 0x8d8a83, flatShading: true });
const placeholderMaterial = new MeshLambertMaterial({ color: 0xb07fd0, flatShading: true });

function createTree(): Object3D {
  const tree = new Group();
  const trunk = new Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 0.6;
  const crown = new Mesh(crownGeometry, crownMaterial);
  crown.position.y = 2.4;
  tree.add(trunk, crown);
  return tree;
}

function createRock(): Object3D {
  const rock = new Mesh(rockGeometry, rockMaterial);
  rock.scale.y = 0.7;
  rock.position.y = 0.4;
  return rock;
}

// Node types without a model render as a placeholder, so new content never breaks the client.
function createPlaceholder(): Object3D {
  const box = new Mesh(placeholderGeometry, placeholderMaterial);
  box.position.y = 0.5;
  return box;
}

const modelsByNodeType: Record<string, () => Object3D> = {
  tree: createTree,
  rock: createRock,
};

export function createResourceNode(node: ResourceNode): Object3D {
  const model = (modelsByNodeType[node.nodeType] ?? createPlaceholder)();
  const holder = new Group();
  holder.add(model);
  holder.name = node.resourceId;
  holder.userData.resourceId = node.resourceId;
  holder.position.set(node.position.x, node.position.y, node.position.z);
  holder.rotation.y = node.yaw;
  holder.scale.setScalar(node.scale);
  holder.userData.baseScale = node.scale;
  return holder;
}

const SHAKE_SECONDS = 0.35;
const SHRINK_SECONDS = 0.4;

interface NodeAnimation {
  elapsed: number;
  depleting: boolean;
}

// Resource nodes that react to gathering: a short shake on every gather, then shrinking away
// when the last charge is taken.
export class ResourceNodeLayer {
  readonly group = new Group();
  private readonly animations = new Map<string, NodeAnimation>();
  private readonly depleted = new Set<string>();

  constructor(nodes: ResourceNode[]) {
    this.group.name = "resource-nodes";
    for (const node of nodes) this.group.add(createResourceNode(node));
  }

  isAvailable(resourceId: string): boolean {
    return !this.depleted.has(resourceId) && this.group.getObjectByName(resourceId) !== undefined;
  }

  // From RESOURCE_GATHERED.
  gathered(resourceId: string, remainingCharges: number): void {
    if (!this.isAvailable(resourceId)) return;
    const depleting = remainingCharges === 0;
    if (depleting) this.depleted.add(resourceId);
    this.animations.set(resourceId, { elapsed: 0, depleting });
  }

  // From a snapshot's nodeCharges: depleted nodes disappear at once, without animating.
  applyCharges(nodeCharges: Record<string, number>): void {
    for (const [resourceId, charges] of Object.entries(nodeCharges)) {
      if (charges === 0) this.remove(resourceId);
    }
  }

  update(deltaSeconds: number): void {
    for (const [resourceId, animation] of this.animations) {
      const node = this.group.getObjectByName(resourceId);
      if (!node) {
        this.animations.delete(resourceId);
        continue;
      }
      animation.elapsed += deltaSeconds;
      const shake = Math.max(0, 1 - animation.elapsed / SHAKE_SECONDS);
      node.rotation.z = Math.sin(animation.elapsed * 40) * 0.15 * shake;

      if (!animation.depleting) {
        if (animation.elapsed >= SHAKE_SECONDS) this.animations.delete(resourceId);
        continue;
      }
      const shrinking = (animation.elapsed - SHAKE_SECONDS) / SHRINK_SECONDS;
      if (shrinking >= 1) {
        this.remove(resourceId);
      } else if (shrinking > 0) {
        node.scale.setScalar((node.userData.baseScale as number) * (1 - shrinking));
      }
    }
  }

  private remove(resourceId: string): void {
    const node = this.group.getObjectByName(resourceId);
    if (node) this.group.remove(node);
    this.depleted.add(resourceId);
    this.animations.delete(resourceId);
  }
}
