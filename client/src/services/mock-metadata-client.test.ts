import { describe, expect, it } from "vitest";
import { MockMetadataClient } from "./mock-metadata-client";
import { ProblemError } from "./problem";

describe("MockMetadataClient", () => {
  it("reports healthy status", async () => {
    const client = new MockMetadataClient();
    const health = await client.getHealth();
    expect(health.status).toBe("ok");
    expect(health.service).toBe("metadata-service");
  });

  it("creates and retrieves a session record", async () => {
    const client = new MockMetadataClient();
    const record = await client.createSessionRecord({
      sessionId: "test-session-123",
      lobbyCode: "TEST99",
      hostPlayerId: "host-1",
      worldSeed: 12345,
      startedAt: new Date().toISOString(),
      participants: [
        {
          playerId: "host-1",
          displayName: "Tester",
          slot: 0,
        },
      ],
    });

    expect(record.sessionId).toBe("test-session-123");
    expect(record.status).toBe("ACTIVE");

    const fetched = await client.getSessionRecord("test-session-123");
    expect(fetched.sessionId).toBe("test-session-123");
    expect(fetched.lobbyCode).toBe("TEST99");
  });

  it("throws SESSION_EXISTS when creating duplicate session record", async () => {
    const client = new MockMetadataClient();
    const req = {
      sessionId: "duplicate-session",
      lobbyCode: "DUP001",
      hostPlayerId: "host-1",
      worldSeed: 111,
      startedAt: new Date().toISOString(),
      participants: [{ playerId: "host-1", displayName: "Tester", slot: 0 }],
    };

    await client.createSessionRecord(req);
    try {
      await client.createSessionRecord(req);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      expect((err as ProblemError).code).toBe("SESSION_EXISTS");
    }
  });

  it("updates record status to COMPLETED on summary", async () => {
    const client = new MockMetadataClient();
    const sessionId = "summary-test";
    await client.createSessionRecord({
      sessionId,
      lobbyCode: "SUM001",
      hostPlayerId: "host-1",
      worldSeed: 111,
      startedAt: new Date().toISOString(),
      participants: [{ playerId: "host-1", displayName: "Tester", slot: 0 }],
    });

    const now = new Date().toISOString();
    const updated = await client.recordSessionSummary(sessionId, {
      endedAt: now,
      outcome: "COMPLETED",
      objectivesCompleted: 1,
      structures: [],
      totalGathered: { wood: 100, stone: 50 },
      contributions: [],
    });

    expect(updated.status).toBe("COMPLETED");
    expect(updated.summary?.endedAt).toBe(now);
  });
});
