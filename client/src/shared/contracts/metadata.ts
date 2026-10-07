// Generated from contracts/schemas/metadata.schema.json by scripts/generate-contract-types.mjs. Do not edit.

export type SessionRecordStatus = "ACTIVE" | "COMPLETED" | "ENDED";

export interface MetadataSchemaRoot {
  Participant?: Participant;
  CreateSessionRecordRequest?: CreateSessionRecordRequest;
  Contribution?: Contribution;
  PlacedStructureSummary?: PlacedStructureSummary;
  SessionSummary?: SessionSummary;
  SessionRecordStatus?: SessionRecordStatus;
  SessionRecord?: SessionRecord;
  SessionRecordList?: SessionRecordList;
}
export interface Participant {
  /**
   * Assigned by the lobby service on create or join. Lowercase UUID v4.
   */
  playerId: string;
  displayName: string;
  /**
   * Seat index in the lobby, 0-based. The host is slot 0. Clients map slots to avatar colors.
   */
  slot: number;
}
/**
 * Sent by the host right after the lobby service starts the session.
 */
export interface CreateSessionRecordRequest {
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
   * Non-negative 31-bit integer so it fits a signed 32-bit int in every stack.
   */
  worldSeed: number;
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  startedAt: string;
  /**
   * @minItems 1
   */
  participants: Participant[];
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
 * Map from resource type to a non-negative whole amount. Keys are resource types declared in the world config rules. Missing keys mean 0.
 */
export interface ResourceAmounts {
  [k: string]: number;
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
export interface SessionRecord {
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
   * Non-negative 31-bit integer so it fits a signed 32-bit int in every stack.
   */
  worldSeed: number;
  /**
   * ISO 8601 date-time in UTC with a Z suffix.
   */
  startedAt: string;
  participants: Participant[];
  /**
   * ACTIVE until a summary is posted. COMPLETED when outcome is COMPLETED, ENDED otherwise.
   */
  status: "ACTIVE" | "COMPLETED" | "ENDED";
  /**
   * Present once a summary is posted.
   */
  durationSeconds?: number;
  summary: null | SessionSummary;
}
export interface SessionRecordList {
  /**
   * Newest startedAt first.
   */
  items: SessionRecord[];
}
