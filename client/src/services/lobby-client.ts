import type { Health } from "../shared/contracts/common";
import type {
  CreateLobbyRequest,
  EndSessionRequest,
  JoinLobbyRequest,
  Lobby,
  LobbyMembership,
  SessionDetails,
  StartSessionRequest,
} from "../shared/contracts/lobby";

/**
 * Client adapter interface for the Island Colony Lobby Service.
 * Matches endpoints specified in contracts/openapi/lobby.openapi.yaml.
 */
export interface LobbyClient {
  /**
   * Health check endpoint: GET /health
   */
  getHealth(): Promise<Health>;

  /**
   * Create a new lobby: POST /api/v1/lobbies
   * The caller becomes the host in slot 0.
   */
  createLobby(request: CreateLobbyRequest): Promise<LobbyMembership>;

  /**
   * Read lobby state: GET /api/v1/lobbies/{lobbyCode}
   * If playerToken is provided, it serves as a heartbeat for the member.
   */
  getLobby(lobbyCode: string, playerToken?: string): Promise<Lobby>;

  /**
   * Join an existing lobby: POST /api/v1/lobbies/{lobbyCode}/players
   * Takes the lowest available slot.
   */
  joinLobby(lobbyCode: string, request: JoinLobbyRequest): Promise<LobbyMembership>;

  /**
   * Leave a lobby: DELETE /api/v1/lobbies/{lobbyCode}/players/{playerId}
   * Player removes themselves or host removes someone.
   */
  leaveLobby(lobbyCode: string, playerId: string, playerToken: string): Promise<void>;

  /**
   * Start a session: POST /api/v1/lobbies/{lobbyCode}/start
   * Host only. Requires connected player IDs matching current members.
   */
  startSession(
    lobbyCode: string,
    playerToken: string,
    request: StartSessionRequest,
  ): Promise<SessionDetails>;

  /**
   * Read session details: GET /api/v1/lobbies/{lobbyCode}/session
   */
  getSession(lobbyCode: string): Promise<SessionDetails>;

  /**
   * End an in-progress session: POST /api/v1/lobbies/{lobbyCode}/end
   */
  endSession(lobbyCode: string, playerToken: string, request: EndSessionRequest): Promise<Lobby>;
}
