import { describe, expect, it } from "vitest";
import { MockLobbyClient } from "./mock-lobby-client";
import { ProblemError } from "./problem";

describe("MockLobbyClient", () => {
  it("reports healthy status", async () => {
    const client = new MockLobbyClient();
    const health = await client.getHealth();
    expect(health.status).toBe("ok");
    expect(health.service).toBe("lobby-service");
  });

  it("creates a lobby with the player in slot 0 as host", async () => {
    const client = new MockLobbyClient();
    const membership = await client.createLobby({ displayName: "Pioneer" });

    expect(membership.playerId).toBeDefined();
    expect(membership.playerToken).toMatch(/^tok_/);
    expect(membership.lobby.lobbyCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(membership.lobby.status).toBe("WAITING");
    expect(membership.lobby.hostPlayerId).toBe(membership.playerId);
    expect(membership.lobby.players).toHaveLength(1);
    expect(membership.lobby.players[0]?.displayName).toBe("Pioneer");
    expect(membership.lobby.players[0]?.slot).toBe(0);
  });

  it("fails create with VALIDATION_FAILED when display name is empty", async () => {
    const client = new MockLobbyClient();
    await expect(client.createLobby({ displayName: "   " })).rejects.toThrowError(ProblemError);

    try {
      await client.createLobby({ displayName: "" });
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      expect((err as ProblemError).code).toBe("VALIDATION_FAILED");
    }
  });

  it("joins an existing lobby and takes the lowest free slot", async () => {
    const client = new MockLobbyClient();
    const host = await client.createLobby({ displayName: "HostUser" });
    const code = host.lobby.lobbyCode;

    const peer = await client.joinLobby(code, { displayName: "PeerUser" });
    expect(peer.lobby.players).toHaveLength(2);
    expect(peer.lobby.players[1]?.displayName).toBe("PeerUser");
    expect(peer.lobby.players[1]?.slot).toBe(1);

    const fetched = await client.getLobby(code, peer.playerToken);
    expect(fetched.players).toHaveLength(2);
  });

  it("rejects joining a non-existent lobby with LOBBY_NOT_FOUND", async () => {
    const client = new MockLobbyClient();
    try {
      await client.joinLobby("NOPE99", { displayName: "PeerUser" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      expect((err as ProblemError).code).toBe("LOBBY_NOT_FOUND");
    }
  });

  it("rejects duplicate display names with NAME_TAKEN", async () => {
    const client = new MockLobbyClient();
    const host = await client.createLobby({ displayName: "Aspect" });
    try {
      await client.joinLobby(host.lobby.lobbyCode, { displayName: "aspect" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      expect((err as ProblemError).code).toBe("NAME_TAKEN");
    }
  });

  it("rejects join when lobby is full (5 players)", async () => {
    const client = new MockLobbyClient();
    const host = await client.createLobby({ displayName: "HostUser" });
    const code = host.lobby.lobbyCode;

    await client.joinLobby(code, { displayName: "P2" });
    await client.joinLobby(code, { displayName: "P3" });
    await client.joinLobby(code, { displayName: "P4" });
    await client.joinLobby(code, { displayName: "P5" });

    try {
      await client.joinLobby(code, { displayName: "P6" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      expect((err as ProblemError).code).toBe("LOBBY_FULL");
    }
  });

  it("allows host to start session and transitions to IN_PROGRESS", async () => {
    const client = new MockLobbyClient();
    const host = await client.createLobby({ displayName: "HostUser" });
    const code = host.lobby.lobbyCode;

    const session = await client.startSession(code, host.playerToken, {
      expectedPlayerIds: [host.playerId],
    });

    expect(session.sessionId).toBeDefined();
    expect(session.lobbyCode).toBe(code);

    const lobby = await client.getLobby(code);
    expect(lobby.status).toBe("IN_PROGRESS");
    expect(lobby.session?.sessionId).toBe(session.sessionId);

    const fetchedSession = await client.getSession(code);
    expect(fetchedSession.sessionId).toBe(session.sessionId);
  });

  it("prevents non-host from starting session", async () => {
    const client = new MockLobbyClient();
    const host = await client.createLobby({ displayName: "HostUser" });
    const peer = await client.joinLobby(host.lobby.lobbyCode, { displayName: "PeerUser" });

    try {
      await client.startSession(host.lobby.lobbyCode, peer.playerToken, {
        expectedPlayerIds: [host.playerId, peer.playerId],
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      expect((err as ProblemError).code).toBe("NOT_HOST");
    }
  });

  it("marks lobby ENDED with HOST_LEFT when host leaves", async () => {
    const client = new MockLobbyClient();
    const host = await client.createLobby({ displayName: "HostUser" });
    await client.leaveLobby(host.lobby.lobbyCode, host.playerToken);

    const lobby = await client.getLobby(host.lobby.lobbyCode);
    expect(lobby.status).toBe("ENDED");
    expect(lobby.endReason).toBe("HOST_LEFT");
  });
});
