import healthExample from "../../../contracts/examples/common/Health.json";
import lobbyWaitingExample from "../../../contracts/examples/lobby/Lobby.waiting.json";
import lobbyMembershipExample from "../../../contracts/examples/lobby/LobbyMembership.json";
import sessionDetailsExample from "../../../contracts/examples/lobby/SessionDetails.json";
import type { Health } from "../shared/contracts/common";
import type {
  CreateLobbyRequest,
  EndSessionRequest,
  JoinLobbyRequest,
  Lobby,
  LobbyMembership,
  LobbyPlayer,
  SessionDetails,
  StartSessionRequest,
} from "../shared/contracts/lobby";
import type { LobbyClient } from "./lobby-client";
import { createProblem, ProblemError } from "./problem";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface StoredLobby {
  lobby: Lobby;
  tokens: Map<string, string>; // playerId -> token
  sessionDetails?: SessionDetails;
}

export class MockLobbyClient implements LobbyClient {
  private lobbies = new Map<string, StoredLobby>();

  constructor() {
    this.seedDefaultLobbies();
  }

  private seedDefaultLobbies(): void {
    // Seed default waiting lobby from contracts/examples
    const seededWaiting = structuredClone(lobbyWaitingExample) as Lobby;
    const tokens = new Map<string, string>();
    for (const player of seededWaiting.players) {
      tokens.set(player.playerId, `tok_${player.playerId.slice(0, 8)}`);
    }

    const hostToken = (lobbyMembershipExample as LobbyMembership).playerToken;
    tokens.set(seededWaiting.hostPlayerId, hostToken);

    this.lobbies.set(seededWaiting.lobbyCode, {
      lobby: seededWaiting,
      tokens,
    });
  }

  private requireLobby(lobbyCode: string): StoredLobby {
    const code = lobbyCode?.trim().toUpperCase();
    const entry = this.lobbies.get(code);
    if (!entry) {
      throw new ProblemError(
        createProblem(404, "LOBBY_NOT_FOUND", "Lobby not found", `Lobby ${code} was not found.`),
      );
    }
    return entry;
  }

  private callerOf(entry: StoredLobby, token?: string): string {
    if (!token) {
      throw new ProblemError(
        createProblem(401, "INVALID_PLAYER_TOKEN", "Invalid player token", "Token is missing."),
      );
    }
    for (const [playerId, storedToken] of entry.tokens.entries()) {
      if (storedToken === token) {
        return playerId;
      }
    }
    throw new ProblemError(
      createProblem(
        401,
        "INVALID_PLAYER_TOKEN",
        "Invalid player token",
        "Player token does not belong to this lobby.",
      ),
    );
  }

  private validateName(displayName?: string): string {
    const name = displayName?.trim();
    if (!name || name.length < 1 || name.length > 16) {
      throw new ProblemError(
        createProblem(
          400,
          "VALIDATION_FAILED",
          "Validation failed",
          "Display name must be between 1 and 16 characters.",
          [{ field: "displayName", message: "Must be between 1 and 16 characters." }],
        ),
      );
    }
    return name;
  }

  async getHealth(): Promise<Health> {
    return {
      status: "ok",
      service: "lobby-service",
      contractsVersion: (healthExample as Health).contractsVersion ?? "1.0.0",
    };
  }

  async createLobby(request: CreateLobbyRequest): Promise<LobbyMembership> {
    const name = this.validateName(request.displayName);

    const lobbyCode = generateCode();
    const playerId = generateId();
    const playerToken = `tok_${generateId().replace(/-/g, "")}`;
    const now = new Date().toISOString();

    const hostPlayer: LobbyPlayer = {
      playerId,
      displayName: name,
      slot: 0,
      joinedAt: now,
    };

    const lobby: Lobby = {
      lobbyCode,
      status: "WAITING",
      hostPlayerId: playerId,
      maxPlayers: 5,
      players: [hostPlayer],
      session: null,
      createdAt: now,
    };

    const tokens = new Map<string, string>();
    tokens.set(playerId, playerToken);

    this.lobbies.set(lobbyCode, { lobby, tokens });

    return {
      lobby: structuredClone(lobby),
      playerId,
      playerToken,
    };
  }

  async getLobby(lobbyCode: string, playerToken?: string): Promise<Lobby> {
    const entry = this.requireLobby(lobbyCode);
    if (playerToken) {
      this.callerOf(entry, playerToken);
    }
    return structuredClone(entry.lobby);
  }

  async joinLobby(lobbyCode: string, request: JoinLobbyRequest): Promise<LobbyMembership> {
    const name = this.validateName(request.displayName);
    const entry = this.requireLobby(lobbyCode);

    if (entry.lobby.status !== "WAITING") {
      throw new ProblemError(
        createProblem(
          409,
          "LOBBY_NOT_WAITING",
          "Lobby is not waiting",
          "Lobby is no longer accepting new players.",
        ),
      );
    }

    if (entry.lobby.players.length >= entry.lobby.maxPlayers) {
      throw new ProblemError(
        createProblem(
          409,
          "LOBBY_FULL",
          "Lobby is full",
          `Lobby ${entry.lobby.lobbyCode} already has ${entry.lobby.maxPlayers} players.`,
        ),
      );
    }

    const nameLower = name.toLowerCase();
    if (entry.lobby.players.some((p) => p.displayName.toLowerCase() === nameLower)) {
      throw new ProblemError(
        createProblem(
          409,
          "NAME_TAKEN",
          "Name already taken",
          `The name "${name}" is already taken in this lobby.`,
        ),
      );
    }

    // Find lowest available slot [0, 4]
    const takenSlots = new Set(entry.lobby.players.map((p) => p.slot));
    let slot = 0;
    while (takenSlots.has(slot) && slot < entry.lobby.maxPlayers) {
      slot++;
    }

    const playerId = generateId();
    const playerToken = `tok_${generateId().replace(/-/g, "")}`;
    const now = new Date().toISOString();

    const newPlayer: LobbyPlayer = {
      playerId,
      displayName: name,
      slot,
      joinedAt: now,
    };

    entry.lobby.players.push(newPlayer);
    entry.tokens.set(playerId, playerToken);

    return {
      lobby: structuredClone(entry.lobby),
      playerId,
      playerToken,
    };
  }

  async leaveLobby(lobbyCode: string, playerId: string, playerToken: string): Promise<void> {
    const entry = this.requireLobby(lobbyCode);
    const callerPlayerId = this.callerOf(entry, playerToken);

    const isHost = callerPlayerId === entry.lobby.hostPlayerId;
    if (playerId !== callerPlayerId && !isHost) {
      throw new ProblemError(
        createProblem(403, "FORBIDDEN", "Forbidden", "Only the host can remove another player."),
      );
    }

    if (playerId === entry.lobby.hostPlayerId) {
      entry.lobby.status = "ENDED";
      entry.lobby.endReason = "HOST_LEFT";
      entry.tokens.delete(playerId);
      return;
    }

    entry.lobby.players = entry.lobby.players.filter((p) => p.playerId !== playerId);
    entry.tokens.delete(playerId);
  }

  async startSession(
    lobbyCode: string,
    playerToken: string,
    request: StartSessionRequest,
  ): Promise<SessionDetails> {
    const entry = this.requireLobby(lobbyCode);
    const callerPlayerId = this.callerOf(entry, playerToken);

    if (entry.lobby.status !== "WAITING") {
      throw new ProblemError(
        createProblem(
          409,
          "LOBBY_NOT_WAITING",
          "Lobby is not waiting",
          "Lobby cannot be started because it is not WAITING.",
        ),
      );
    }

    if (callerPlayerId !== entry.lobby.hostPlayerId) {
      throw new ProblemError(
        createProblem(403, "NOT_HOST", "Not host", "Only the host can start the session."),
      );
    }

    // Check expectedPlayerIds matches current players
    if (request.expectedPlayerIds && request.expectedPlayerIds.length > 0) {
      const currentIds = new Set(entry.lobby.players.map((p) => p.playerId));
      const expectedIds = new Set(request.expectedPlayerIds);
      if (
        currentIds.size !== expectedIds.size ||
        ![...currentIds].every((id) => expectedIds.has(id))
      ) {
        throw new ProblemError(
          createProblem(
            409,
            "LOBBY_CHANGED",
            "Lobby changed",
            "Members in the lobby changed; please refresh and try again.",
          ),
        );
      }
    }

    const sessionId = generateId();
    const now = new Date().toISOString();
    const detailsExample = sessionDetailsExample as SessionDetails;

    entry.lobby.status = "IN_PROGRESS";
    entry.lobby.session = {
      sessionId,
      worldSeed: detailsExample.worldConfig?.seed ?? 19842017,
      startedAt: now,
    };

    const sessionDetails: SessionDetails = {
      ...detailsExample,
      sessionId,
      lobbyCode: entry.lobby.lobbyCode,
      hostPlayerId: entry.lobby.hostPlayerId,
      startedAt: now,
      players: structuredClone(entry.lobby.players),
    };

    entry.sessionDetails = sessionDetails;
    return structuredClone(sessionDetails);
  }

  async getSession(lobbyCode: string): Promise<SessionDetails> {
    const entry = this.requireLobby(lobbyCode);

    if (!entry.sessionDetails) {
      throw new ProblemError(
        createProblem(
          409,
          "SESSION_NOT_STARTED",
          "Session not started",
          "Session has not started for this lobby.",
        ),
      );
    }

    return structuredClone(entry.sessionDetails);
  }

  async endSession(
    lobbyCode: string,
    playerToken: string,
    request: EndSessionRequest,
  ): Promise<Lobby> {
    const entry = this.requireLobby(lobbyCode);
    const callerPlayerId = this.callerOf(entry, playerToken);

    if (callerPlayerId !== entry.lobby.hostPlayerId) {
      throw new ProblemError(
        createProblem(403, "NOT_HOST", "Not host", "Only the host can end the session."),
      );
    }

    entry.lobby.status = "ENDED";
    entry.lobby.endReason = request.reason;

    return structuredClone(entry.lobby);
  }
}
