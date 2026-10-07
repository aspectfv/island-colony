// Generated from contracts/schemas/world.schema.json by scripts/generate-contract-types.mjs. Do not edit.

/**
 * Discriminated by kind. Clients that do not recognize a kind still show description.
 */
export type ObjectiveDef = {
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  objectiveId: string;
  kind: string;
  /**
   * HUD text shown for this objective.
   */
  description: string;
} & ObjectiveDef1;
export type ObjectiveDef1 = GatherObjective | BuildObjective | OtherObjective;

/**
 * Everything a client needs to build the initial island and everything the host needs to enforce the rules. Produced by the world service, passed through the lobby service unchanged. See docs/world-config.md.
 */
export interface WorldSchemaRoot {
  WorldConfig?: WorldConfig;
  Island?: Island;
  SpawnPoint?: SpawnPoint;
  BuildZone?: BuildZone;
  ResourceNode?: ResourceNode;
  Rules?: Rules;
  ResourceDef?: ResourceDef;
  NodeTypeDef?: NodeTypeDef;
  StructureDef?: StructureDef;
  ObjectiveDef?: ObjectiveDef;
  GatherObjective?: GatherObjective;
  BuildObjective?: BuildObjective;
  CreateWorldRequest?: CreateWorldRequest;
  OtherObjective?: OtherObjective;
}
export interface WorldConfig {
  /**
   * Major version of this format. Bumped only on breaking changes.
   */
  configVersion: 1;
  /**
   * Non-negative 31-bit integer so it fits a signed 32-bit int in every stack.
   */
  seed: number;
  island: Island;
  /**
   * One spawn point per lobby slot, indexed by slot.
   *
   * @minItems 5
   */
  spawnPoints: SpawnPoint[];
  /**
   * @minItems 1
   */
  buildZones: BuildZone[];
  resourceNodes: ResourceNode[];
  rules: Rules;
}
/**
 * Square heightmap centered on the origin. heights is row-major: index = row * resolution + col, where row walks +Z from -size/2 and col walks +X from -size/2.
 */
export interface Island {
  /**
   * Edge length in meters.
   */
  size: number;
  /**
   * Samples per edge. Cell size is size / (resolution - 1).
   */
  resolution: number;
  /**
   * Y of the water surface. Ground at or below this is water.
   */
  waterLevel: number;
  /**
   * resolution * resolution terrain heights in meters, rounded to 2 decimals.
   */
  heights: number[];
}
export interface SpawnPoint {
  position: Vec2;
  /**
   * Rotation about +Y in radians, normalized to [-PI, PI]. 0 faces -Z.
   */
  yaw: number;
}
/**
 * Point on the ground plane in meters. See docs/conventions.md for axes.
 */
export interface Vec2 {
  x: number;
  z: number;
}
/**
 * Circle on land where structures may be placed. A structure's footprint must lie fully inside one zone.
 */
export interface BuildZone {
  /**
   * Identifier for an instance in the world: a resource node (tree-0042) or a placed structure (structure-3).
   */
  zoneId: string;
  center: Vec2;
  radius: number;
}
/**
 * A gatherable object. Charges and yield come from its node type in rules.nodeTypes.
 */
export interface ResourceNode {
  /**
   * Identifier for an instance in the world: a resource node (tree-0042) or a placed structure (structure-3).
   */
  resourceId: string;
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  nodeType: string;
  position: Vec3;
  /**
   * Rotation about +Y in radians, normalized to [-PI, PI]. 0 faces -Z.
   */
  yaw: number;
  /**
   * Visual scale only. Does not change footprint or yield.
   */
  scale: number;
}
/**
 * World position in meters. Y is up.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
/**
 * Balancing and content catalogs. Adding content means adding entries here; no schema or protocol change.
 */
export interface Rules {
  /**
   * @minItems 1
   */
  resources: ResourceDef[];
  /**
   * @minItems 1
   */
  nodeTypes: NodeTypeDef[];
  /**
   * @minItems 1
   */
  structures: StructureDef[];
  /**
   * Completed strictly in order. The session completes when the last objective completes.
   *
   * @minItems 1
   */
  objectives: ObjectiveDef[];
  startingResources: ResourceAmounts;
  gathering: {
    /**
     * Max ground distance in meters from player to node center.
     */
    interactionRange: number;
    /**
     * Min time between two accepted gathers by the same player.
     */
    cooldownMs: number;
  };
  building: {
    /**
     * Max ground distance in meters from player to structure center.
     */
    placementRange: number;
  };
}
export interface ResourceDef {
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  resourceType: string;
  displayName: string;
}
export interface NodeTypeDef {
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  nodeType: string;
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  resourceType: string;
  /**
   * Accepted gathers before the node is depleted and removed.
   */
  charges: number;
  yieldPerGather: number;
  /**
   * Blocks structure placement while the node is not depleted.
   */
  footprintRadius: number;
}
export interface StructureDef {
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  structureType: string;
  displayName: string;
  cost: ResourceAmounts;
  footprintRadius: number;
}
/**
 * Map from resource type to a non-negative whole amount. Keys are resource types declared in the world config rules. Missing keys mean 0.
 */
export interface ResourceAmounts {
  [k: string]: number;
}
/**
 * Completes when shared totals reach target. Nothing is deducted.
 */
export interface GatherObjective {
  objectiveId?: unknown;
  description?: unknown;
  kind: "GATHER";
  target: ResourceAmounts;
}
/**
 * Completes when one structure of structureType is placed. Only the current BUILD objective's structure may be placed.
 */
export interface BuildObjective {
  objectiveId?: unknown;
  description?: unknown;
  kind: "BUILD";
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  structureType: string;
}
/**
 * Any kind this schema version does not define. Lets older consumers load configs with newer objective kinds; they show description. New kinds get their own branch and are added to the not-enum below.
 */
export interface OtherObjective {
  kind: {
    [k: string]: unknown;
  };
}
export interface CreateWorldRequest {
  /**
   * Non-negative 31-bit integer so it fits a signed 32-bit int in every stack.
   */
  seed?: number;
}
