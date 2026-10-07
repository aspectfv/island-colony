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
  return holder;
}

export function createResourceNodes(nodes: ResourceNode[]): Group {
  const group = new Group();
  group.name = "resource-nodes";
  for (const node of nodes) group.add(createResourceNode(node));
  return group;
}
