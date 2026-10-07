// Generated from contracts/schemas/gameplay.schema.json by scripts/generate-contract-types.mjs. Do not edit.

/**
 * Major version of the gameplay protocol. Bumped only on breaking changes.
 */
export type ProtocolVersion = 1;
/**
 * Host event sequence number. Starts at 1 per session and increases by 1 for every state-changing event.
 */
export type Seq = number;
/**
 * Chosen by the requester, unique per requester for the session. Echoed in the result or rejection.
 */
export type RequestId = string;
/**
 * Sent on the game channel by a peer. The host's own client produces the same messages locally.
 */
export type PeerToHostGameMessage = ClientReady | GatherResource | PlaceBuilding;
/**
 * Sent on the game channel by the host.
 */
export type HostToPeerGameMessage =
  | SessionStarted
  | StateSnapshot
  | PlayerJoined
  | PlayerLeft
  | ResourceGathered
  | BuildingPlaced
  | ObjectiveUpdated
  | SessionCompleted
  | SessionEnded
  | ActionRejected;
export type SessionStatus = "ACTIVE" | "COMPLETED" | "ENDED";
/**
 * Sent on the movement channel (unordered, no retransmits).
 */
export type MovementMessage = PlayerMove | PlayerMoved;
/**
 * Open set of avatar animation states. Unknown values fall back to idle.
 */
export type Animation = string;

/**
 * JSON text messages between host and peers. Star topology: every peer talks only to the host. See docs/gameplay-protocol.md.
 */
export interface GameplaySchemaRoot {
  ProtocolVersion?: ProtocolVersion;
  Seq?: Seq;
  RequestId?: RequestId;
  PeerToHostGameMessage?: PeerToHostGameMessage;
  HostToPeerGameMessage?: HostToPeerGameMessage;
  MovementMessage?: MovementMessage;
  SessionStatus?: SessionStatus;
  GamePlayer?: GamePlayer;
  PlacedStructure?: PlacedStructure;
  GameState?: GameState;
  ClientReady?: ClientReady;
  GatherResource?: GatherResource;
  PlaceBuilding?: PlaceBuilding;
  SessionStarted?: SessionStarted;
  StateSnapshot?: StateSnapshot;
  PlayerJoined?: PlayerJoined;
  PlayerLeft?: PlayerLeft;
  ResourceGathered?: ResourceGathered;
  BuildingPlaced?: BuildingPlaced;
  ObjectiveUpdated?: ObjectiveUpdated;
  SessionCompleted?: SessionCompleted;
  SessionEnded?: SessionEnded;
  ActionRejected?: ActionRejected;
  Animation?: Animation;
  PlayerMove?: PlayerMove;
  PlayerMoved?: PlayerMoved;
}
/**
 * Peer has loaded the world and is ready for the snapshot.
 */
export interface ClientReady {
  type: "CLIENT_READY";
  protocolVersion: ProtocolVersion;
}
export interface GatherResource {
  type: "GATHER_RESOURCE";
  requestId: RequestId;
  /**
   * Identifier for an instance in the world: a resource node (tree-0042) or a placed structure (structure-3).
   */
  resourceId: string;
}
export interface PlaceBuilding {
  type: "PLACE_BUILDING";
  requestId: RequestId;
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  structureType: string;
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
 * Broadcast once by the host after the lobby service starts the session. Peers then fetch the world config from the lobby service.
 */
export interface SessionStarted {
  type: "SESSION_STARTED";
  /**
   * Assigned by the lobby service when the host starts a session. Lowercase UUID v4.
   */
  sessionId: string;
  /**
   * Human-friendly lobby identifier players type to join. 6 characters, no ambiguous letters or digits.
   */
  lobbyCode: string;
  protocolVersion: ProtocolVersion;
}
/**
 * Sent to one peer in reply to CLIENT_READY. seq is the last event already applied in state.
 */
export interface StateSnapshot {
  type: "STATE_SNAPSHOT";
  seq: number;
  state: GameState;
}
/**
 * Full authoritative state. Static world data stays in the world config; this holds only what changes.
 */
export interface GameState {
  /**
   * Assigned by the lobby service when the host starts a session. Lowercase UUID v4.
   */
  sessionId: string;
  status: SessionStatus;
  /**
   * The host from session start, plus every peer that has sent CLIENT_READY.
   */
  players: GamePlayer[];
  resources: ResourceAmounts;
  /**
   * Remaining charges for nodes that have been gathered at least once. 0 means depleted. Nodes not listed have full charges.
   */
  nodeCharges: {
    [k: string]: number;
  };
  structures: PlacedStructure[];
  /**
   * Index into rules.objectives of the current objective. Equals rules.objectives.length once all are complete.
   */
  objectiveIndex: number;
}
export interface GamePlayer {
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  displayName: string;
  /**
   * Seat index in the lobby, 0-based. The host is slot 0. Clients map slots to avatar colors.
   */
  slot: number;
  position: Vec3;
  /**
   * Rotation about +Y in radians, normalized to [-PI, PI]. 0 faces -Z.
   */
  yaw: number;
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
 * Map from resource type to a non-negative whole amount. Keys are resource types declared in the world config rules. Missing keys mean 0.
 */
export interface ResourceAmounts {
  [k: string]: number;
}
export interface PlacedStructure {
  /**
   * Identifier for an instance in the world: a resource node (tree-0042) or a placed structure (structure-3).
   */
  structureId: string;
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  structureType: string;
  position: Vec21;
  /**
   * Rotation about +Y in radians, normalized to [-PI, PI]. 0 faces -Z.
   */
  yaw: number;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  placedBy: string;
}
/**
 * Point on the ground plane in meters. See docs/conventions.md for axes.
 */
export interface Vec21 {
  x: number;
  z: number;
}
/**
 * A player finished loading and entered the world.
 */
export interface PlayerJoined {
  type: "PLAYER_JOINED";
  seq: Seq;
  player: GamePlayer;
}
export interface PlayerLeft {
  type: "PLAYER_LEFT";
  seq: Seq;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  /**
   * Open set.
   */
  reason: string;
}
export interface ResourceGathered {
  type: "RESOURCE_GATHERED";
  seq: Seq;
  requestId: RequestId;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  /**
   * Identifier for an instance in the world: a resource node (tree-0042) or a placed structure (structure-3).
   */
  resourceId: string;
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  resourceType: string;
  /**
   * Amount added to the shared total by this gather.
   */
  amount: number;
  /**
   * 0 means the node is depleted and must be removed.
   */
  remainingCharges: number;
  resources: ResourceAmounts1;
}
/**
 * Map from resource type to a non-negative whole amount. Keys are resource types declared in the world config rules. Missing keys mean 0.
 */
export interface ResourceAmounts1 {
  [k: string]: number;
}
export interface BuildingPlaced {
  type: "BUILDING_PLACED";
  seq: Seq;
  requestId: RequestId;
  structure: PlacedStructure;
  resources: ResourceAmounts2;
}
/**
 * Map from resource type to a non-negative whole amount. Keys are resource types declared in the world config rules. Missing keys mean 0.
 */
export interface ResourceAmounts2 {
  [k: string]: number;
}
export interface ObjectiveUpdated {
  type: "OBJECTIVE_UPDATED";
  seq: Seq;
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  completedObjectiveId: string;
  /**
   * New current objective index. Equals rules.objectives.length when the last one completed.
   */
  objectiveIndex: number;
}
/**
 * Sent right after the OBJECTIVE_UPDATED that completes the last objective.
 */
export interface SessionCompleted {
  type: "SESSION_COMPLETED";
  seq: Seq;
  summary: SessionSummary;
}
/**
 * Built by the host from its authoritative state. Also carried by the SESSION_COMPLETED gameplay message.
 */
export interface SessionSummary {
  /**
   * Open set. COMPLETED or HOST_ENDED in v1.
   */
  outcome: string;
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  endedAt: string;
  objectivesCompleted: number;
  structures: PlacedStructureSummary[];
  totalGathered: ResourceAmounts;
  contributions: Contribution[];
}
export interface PlacedStructureSummary {
  /**
   * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
   */
  structureType: string;
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  placedBy: string;
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  placedAt: string;
}
export interface Contribution {
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  gathered: ResourceAmounts;
  structuresPlaced: number;
}
/**
 * The host ended the session early. Not sent on host disconnect; peers detect that from the channel closing.
 */
export interface SessionEnded {
  type: "SESSION_ENDED";
  seq: Seq;
  reason: "HOST_ENDED";
  summary: SessionSummary;
}
/**
 * Sent only to the requester. No seq because state did not change.
 */
export interface ActionRejected {
  type: "ACTION_REJECTED";
  requestId: RequestId;
  /**
   * Open set. Known codes are listed in docs/gameplay-protocol.md.
   */
  code: string;
  message?: string;
}
/**
 * Peer to host, at most 20 per second.
 */
export interface PlayerMove {
  type: "PLAYER_MOVE";
  /**
   * Per-sender counter starting at 1, +1 per message. Receivers drop messages with n not greater than the last seen (initially 0).
   */
  n: number;
  position: Vec3;
  /**
   * Rotation about +Y in radians, normalized to [-PI, PI]. 0 faces -Z.
   */
  yaw: number;
  animation: Animation;
}
/**
 * Host to peers. Relays each peer's PLAYER_MOVE to everyone else, plus the host's own movement.
 */
export interface PlayerMoved {
  type: "PLAYER_MOVED";
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  /**
   * Per-sender counter starting at 1, +1 per message. Receivers drop messages with n not greater than the last seen (initially 0).
   */
  n: number;
  position: Vec3;
  /**
   * Rotation about +Y in radians, normalized to [-PI, PI]. 0 faces -Z.
   */
  yaw: number;
  animation: Animation;
}
