import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import type { PlacedStructure } from "../shared/contracts/gameplay";
import type { Island } from "../shared/contracts/world";
import { sampleHeight } from "./terrain";

const flat = (color: number) => new MeshLambertMaterial({ color, flatShading: true });
const canvas = flat(0xe9dcb8);
const wood = flat(0x8a5a35);
const darkWood = flat(0x5e3b22);
const roof = flat(0xa4402f);
const stone = flat(0x8d8a83);
const placeholder = flat(0xb07fd0);
const fire = new MeshLambertMaterial({ color: 0xff8a1f, emissive: 0xff5a00, flatShading: true });

function part(geometry: BufferGeometry, material: Material, x: number, y: number, z: number): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

function createCamp(): Object3D {
  const camp = new Group();
  const tent = part(new ConeGeometry(1.6, 2.2, 4), canvas, -0.9, 1.1, 0);
  tent.rotation.y = Math.PI / 4;
  camp.add(tent);
  const pebble = new DodecahedronGeometry(0.18);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    camp.add(part(pebble, stone, 1.3 + Math.cos(angle) * 0.5, 0.1, 0.8 + Math.sin(angle) * 0.5));
  }
  camp.add(part(new ConeGeometry(0.28, 0.7, 5), fire, 1.3, 0.35, 0.8));
  const log = part(new CylinderGeometry(0.12, 0.12, 1.4, 5), darkWood, 1.3, 0.12, -0.5);
  log.rotation.z = Math.PI / 2;
  camp.add(log);
  return camp;
}

function createStorageHut(): Object3D {
  const hut = new Group();
  hut.add(part(new BoxGeometry(4, 2.2, 3.2), wood, 0, 1.1, 0));
  const top = part(new ConeGeometry(3.1, 1.6, 4), roof, 0, 3, 0);
  top.rotation.y = Math.PI / 4;
  top.scale.set(1.15, 1, 0.9);
  hut.add(top);
  hut.add(part(new BoxGeometry(0.9, 1.5, 0.1), darkWood, 0, 0.75, -1.62));
  return hut;
}

function createSignalBeacon(): Object3D {
  const beacon = new Group();
  beacon.add(part(new CylinderGeometry(1.5, 1.7, 1, 6), stone, 0, 0.5, 0));
  beacon.add(part(new CylinderGeometry(0.7, 1, 5, 6), wood, 0, 3.5, 0));
  beacon.add(part(new CylinderGeometry(1.2, 0.8, 0.6, 6), darkWood, 0, 6.3, 0));
  beacon.add(part(new ConeGeometry(0.8, 1.8, 6), fire, 0, 7.5, 0));
  return beacon;
}

// Structure types without a model render as a placeholder, so new content never breaks the client.
function createPlaceholder(): Object3D {
  return part(new BoxGeometry(2, 2, 2), placeholder, 0, 1, 0);
}

const modelsByStructureType: Record<string, () => Object3D> = {
  camp: createCamp,
  "storage-hut": createStorageHut,
  "signal-beacon": createSignalBeacon,
};

// Placed structures, keyed by structureId. Placing the same structure twice is a no-op, so a
// snapshot and the events after it can both be applied safely.
export class StructureLayer {
  readonly group = new Group();

  constructor(private readonly island: Island) {
    this.group.name = "structures";
  }

  place(structure: PlacedStructure): void {
    if (this.group.getObjectByName(structure.structureId)) return;
    const holder = new Group();
    holder.add((modelsByStructureType[structure.structureType] ?? createPlaceholder)());
    holder.name = structure.structureId;
    const { x, z } = structure.position;
    holder.position.set(x, sampleHeight(this.island, x, z), z);
    holder.rotation.y = structure.yaw;
    this.group.add(holder);
  }

  sync(structures: PlacedStructure[]): void {
    for (const structure of structures) this.place(structure);
  }
}
