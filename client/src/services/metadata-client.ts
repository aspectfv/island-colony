import type { Health } from "../shared/contracts/common";
import type {
  CreateSessionRecordRequest,
  SessionRecord,
  SessionRecordList,
  SessionRecordStatus,
  SessionSummary,
} from "../shared/contracts/metadata";

/**
 * Client adapter interface for the Island Colony Session Metadata Service.
 * Matches endpoints specified in contracts/openapi/metadata.openapi.yaml.
 */
export interface MetadataClient {
  /**
   * Health check endpoint: GET /health
   */
  getHealth(): Promise<Health>;

  /**
   * Record a started session: POST /api/v1/sessions
   * Sent by host client right after the session starts.
   */
  createSessionRecord(request: CreateSessionRecordRequest): Promise<SessionRecord>;

  /**
   * Read session record: GET /api/v1/sessions/{sessionId}
   */
  getSessionRecord(sessionId: string): Promise<SessionRecord>;

  /**
   * List recent session records: GET /api/v1/sessions
   */
  listSessionRecords(params?: {
    status?: SessionRecordStatus;
    limit?: number;
  }): Promise<SessionRecordList>;

  /**
   * Record session summary on completion: POST /api/v1/sessions/{sessionId}/summary
   */
  recordSessionSummary(sessionId: string, summary: SessionSummary): Promise<SessionRecord>;
}
