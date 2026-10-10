import healthExample from "../../../contracts/examples/common/Health.json";
import sessionRecordActiveExample from "../../../contracts/examples/metadata/SessionRecord.active.json";
import sessionRecordListExample from "../../../contracts/examples/metadata/SessionRecordList.json";
import type { Health } from "../shared/contracts/common";
import type {
  CreateSessionRecordRequest,
  SessionRecord,
  SessionRecordList,
  SessionRecordStatus,
  SessionSummary,
} from "../shared/contracts/metadata";
import type { MetadataClient } from "./metadata-client";
import { createProblem, ProblemError } from "./problem";

export class MockMetadataClient implements MetadataClient {
  private records = new Map<string, SessionRecord>();

  constructor() {
    this.seedDefaultRecords();
  }

  private seedDefaultRecords(): void {
    const seededActive = JSON.parse(JSON.stringify(sessionRecordActiveExample)) as SessionRecord;
    this.records.set(seededActive.sessionId, seededActive);

    const listExample = sessionRecordListExample as unknown as SessionRecordList;
    if (listExample.items) {
      for (const item of listExample.items) {
        if (!this.records.has(item.sessionId)) {
          this.records.set(item.sessionId, JSON.parse(JSON.stringify(item)) as SessionRecord);
        }
      }
    }
  }

  async getHealth(): Promise<Health> {
    return {
      status: "ok",
      service: "metadata-service",
      contractsVersion: (healthExample as Health).contractsVersion ?? "1.0.0",
    };
  }

  async createSessionRecord(request: CreateSessionRecordRequest): Promise<SessionRecord> {
    if (!request.sessionId || !request.lobbyCode || !request.participants?.length) {
      throw new ProblemError(
        createProblem(
          400,
          "VALIDATION_FAILED",
          "Validation failed",
          "Session record missing required fields.",
        ),
      );
    }

    if (this.records.has(request.sessionId)) {
      throw new ProblemError(
        createProblem(
          409,
          "SESSION_EXISTS",
          "Session already exists",
          `Session ${request.sessionId} already exists.`,
        ),
      );
    }

    const record: SessionRecord = {
      sessionId: request.sessionId,
      lobbyCode: request.lobbyCode,
      hostPlayerId: request.hostPlayerId,
      worldSeed: request.worldSeed,
      startedAt: request.startedAt,
      status: "ACTIVE",
      summary: null,
      participants: JSON.parse(JSON.stringify(request.participants)),
    };

    this.records.set(record.sessionId, record);
    return JSON.parse(JSON.stringify(record)) as SessionRecord;
  }

  async getSessionRecord(sessionId: string): Promise<SessionRecord> {
    const record = this.records.get(sessionId);
    if (!record) {
      throw new ProblemError(
        createProblem(
          404,
          "SESSION_NOT_FOUND",
          "Session not found",
          `Session record for ${sessionId} was not found.`,
        ),
      );
    }
    return JSON.parse(JSON.stringify(record)) as SessionRecord;
  }

  async listSessionRecords(params?: {
    status?: SessionRecordStatus;
    limit?: number;
  }): Promise<SessionRecordList> {
    let items = Array.from(this.records.values());

    if (params?.status) {
      items = items.filter((r) => r.status === params.status);
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const limit = params?.limit ?? 20;
    const paginated = items.slice(0, limit);

    return {
      items: JSON.parse(JSON.stringify(paginated)) as SessionRecord[],
    };
  }

  async recordSessionSummary(sessionId: string, summary: SessionSummary): Promise<SessionRecord> {
    const record = this.records.get(sessionId);
    if (!record) {
      throw new ProblemError(
        createProblem(
          404,
          "SESSION_NOT_FOUND",
          "Session not found",
          `Session record for ${sessionId} was not found.`,
        ),
      );
    }

    record.summary = JSON.parse(JSON.stringify(summary));
    record.status = summary.outcome === "COMPLETED" ? "COMPLETED" : "ENDED";
    record.durationSeconds = Math.max(
      0,
      Math.round(
        (new Date(summary.endedAt).getTime() - new Date(record.startedAt).getTime()) / 1000,
      ),
    );

    return JSON.parse(JSON.stringify(record)) as SessionRecord;
  }
}
