// Generated from contracts/schemas/lobby.schema.json by scripts/generate-contract-types.mjs. Do not edit.

export type LobbyStatus = "WAITING" | "IN_PROGRESS" | "ENDED";
/**
 * Open set. Clients show a generic message for unknown values.
 */
export type EndReason = string;
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
} & (GatherObjective | BuildObjective | OtherObjective);

export interface LobbySchemaRoot {
  CreateLobbyRequest?: CreateLobbyRequest;
  JoinLobbyRequest?: JoinLobbyRequest;
  LobbyMembership?: LobbyMembership;
  LobbyStatus?: LobbyStatus;
  EndReason?: EndReason;
  Lobby?: Lobby;
  LobbyPlayer?: LobbyPlayer;
  SessionInfo?: SessionInfo;
  SessionDetails?: SessionDetails;
  EndSessionRequest?: EndSessionRequest;
  StartSessionRequest?: StartSessionRequest;
}
export interface CreateLobbyRequest {
  displayName: string;
}
export interface JoinLobbyRequest {
  displayName: string;
}
/**
 * Returned once on create or join. The client keeps playerToken for later calls.
 */
export interface LobbyMembership {
  lobby: Lobby;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  /**
   * Opaque secret returned once on create or join. Sent as the X-Player-Token header. Never shown to other players.
   */
  playerToken: string;
}
export interface Lobby {
  /**
   * Human-friendly lobby identifier players type to join. 6 characters, no ambiguous letters or digits.
   */
  lobbyCode: string;
  status: LobbyStatus;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  hostPlayerId: string;
  maxPlayers: number;
  /**
   * Ordered by slot.
   */
  players: LobbyPlayer[];
  /**
   * Null until the host starts the session.
   */
  session: null | SessionInfo;
  /**
   * Present only when status is ENDED.
   */
  endReason?: string;
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  createdAt: string;
}
export interface LobbyPlayer {
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  displayName: string;
  /**
   * Seat index in the lobby, 0-based. The host is slot 0. Clients map slots to avatar colors.
   */
  slot: number;
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  joinedAt: string;
}
/**
 * Light session summary embedded in Lobby so polling stays small.
 */
export interface SessionInfo {
  /**
   * Assigned by the lobby service when the host starts a session. Lowercase UUID v4.
   */
  sessionId: string;
  /**
   * Non-negative 31-bit integer so it fits a signed 32-bit int in every stack.
   */
  worldSeed: number;
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  startedAt: string;
}
/**
 * Full session including the world config. Returned by start and by GET session.
 */
export interface SessionDetails {
  /**
   * Assigned by the lobby service when the host starts a session. Lowercase UUID v4.
   */
  sessionId: string;
  /**
   * Human-friendly lobby identifier players type to join. 6 characters, no ambiguous letters or digits.
   */
  lobbyCode: string;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  hostPlayerId: string;
  /**
   * Lobby members at the moment the session started. Ordered by slot.
   */
  players: LobbyPlayer[];
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  startedAt: string;
  worldConfig: WorldConfig;
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
export interface EndSessionRequest {
  reason: "COMPLETED" | "HOST_ENDED";
}
/**
 * The members the host sees with open game channels. The lobby service starts only if this matches its member list exactly.
 */
export interface StartSessionRequest {
  /**
   * @minItems 1
   *
   * Items: Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  expectedPlayerIds: string[];
}
