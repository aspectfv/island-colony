import { Group, type Object3D } from "three";
import type { WorldConfig } from "../shared/contracts/world";
import { disposeObject } from "./dispose";
import { createIsland } from "./island";
import { ResourceNodeLayer } from "./resource-nodes";
import { StructureLayer } from "./structures";

export interface LoadedWorld {
  config: WorldConfig;
  resourceNodes: ResourceNodeLayer;
  structures: StructureLayer;
}

// Everything drawn for one world config. Loading another world removes and frees the previous one
// first, so sessions can follow each other without leaking GPU memory.
export class WorldScene {
  private root: Group | null = null;

  constructor(private readonly parent: Object3D) {}

  load(config: WorldConfig): LoadedWorld {
    this.unload();
    const resourceNodes = new ResourceNodeLayer(config.resourceNodes);
    const structures = new StructureLayer(config.island);
    const root = new Group();
    root.name = "world";
    root.add(createIsland(config), resourceNodes.group, structures.group);
    this.parent.add(root);
    this.root = root;
    return { config, resourceNodes, structures };
  }

  unload(): void {
    if (!this.root) return;
    this.parent.remove(this.root);
    disposeObject(this.root);
    this.root = null;
  }
}
