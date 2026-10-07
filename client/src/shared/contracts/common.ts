// Generated from contracts/schemas/common.schema.json by scripts/generate-contract-types.mjs. Do not edit.

/**
 * Assigned by the lobby service on create or join. Lowercase UUID v4.
 */
export type PlayerId = string;
/**
 * Assigned by the lobby service when the host starts a session. Lowercase UUID v4.
 */
export type SessionId = string;
/**
 * Human-friendly lobby identifier players type to join. 6 characters, no ambiguous letters or digits.
 */
export type LobbyCode = string;
/**
 * Opaque secret returned once on create or join. Sent as the X-Player-Token header. Never shown to other players.
 */
export type PlayerToken = string;
export type DisplayName = string;
/**
 * Seat index in the lobby, 0-based. The host is slot 0. Clients map slots to avatar colors.
 */
export type Slot = number;
/**
 * Non-negative 31-bit integer so it fits a signed 32-bit int in every stack.
 */
export type WorldSeed = number;
/**
 * Identifier for data-driven content: resource types, node types, structure types, objectives. Lowercase kebab-case. Open set: new values are added in the world config, not in schemas.
 */
export type ContentId = string;
/**
 * Identifier for an instance in the world: a resource node (tree-0042) or a placed structure (structure-3).
 */
export type EntityId = string;
/**
 * ISO 8601 date-time in UTC with a Z suffix.
 */
export type Timestamp = string;
/**
 * Rotation about +Y in radians, normalized to [-PI, PI]. 0 faces -Z.
 */
export type Yaw = number;

export interface CommonSchemaRoot {
  PlayerId?: PlayerId;
  SessionId?: SessionId;
  LobbyCode?: LobbyCode;
  PlayerToken?: PlayerToken;
  DisplayName?: DisplayName;
  Slot?: Slot;
  WorldSeed?: WorldSeed;
  ContentId?: ContentId;
  EntityId?: EntityId;
  Timestamp?: Timestamp;
  Vec2?: Vec2;
  Vec3?: Vec3;
  Yaw?: Yaw;
  ResourceAmounts?: ResourceAmounts;
  Problem?: Problem;
  Health?: Health;
}
/**
 * Point on the ground plane in meters. See docs/conventions.md for axes.
 */
export interface Vec2 {
  x: number;
  z: number;
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
/**
 * Error body for every REST service, following RFC 9457 (application/problem+json) with a required machine-readable code.
 */
export interface Problem {
  type?: string;
  status: number;
  /**
   * Short human summary. Stable per code.
   */
  title: string;
  /**
   * Human explanation of this occurrence. Safe to show in the UI.
   */
  detail?: string;
  /**
   * UPPER_SNAKE_CASE error code. Open set: clients must handle unknown codes by showing detail or title.
   */
  code: string;
  /**
   * Field-level validation failures. Present only with code VALIDATION_FAILED.
   */
  errors?: {
    /**
     * JSON Pointer or dotted path to the field.
     */
    field: string;
    message: string;
  }[];
}
export interface Health {
  status: "ok";
  service: string;
  /**
   * Value of contracts/VERSION this build implements.
   */
  contractsVersion?: string;
}
