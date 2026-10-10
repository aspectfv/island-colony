import type { Lobby, LobbyMembership, SessionDetails } from "../shared/contracts/lobby";
import type { Services } from "../services/service-factory";
import { MainMenu } from "./main-menu";
import { LobbyScreen } from "./lobby-screen";
import "./styles.css";

export interface GameStartPayload {
  sessionDetails: SessionDetails;
  slot: number;
  playerId: string;
}

export type ScreenState = "MENU" | "LOBBY" | "GAME";

export class UIManager {
  private rootElement: HTMLElement;
  private currentScreen: ScreenState = "MENU";
  private activeLobbyScreen: LobbyScreen | null = null;
  private currentMembership: LobbyMembership | null = null;

  constructor(
    private services: Services,
    private onStartGameCallback: (payload: GameStartPayload) => void | Promise<void>,
    private onScreenChange?: (screen: ScreenState) => void,
  ) {
    let root = document.getElementById("ui-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ui-root";
      document.body.appendChild(root);
    }
    this.rootElement = root;
    this.showMainMenu();
  }

  getScreenState(): ScreenState {
    return this.currentScreen;
  }

  showMainMenu(): void {
    this.cleanupActiveScreen();
    this.currentScreen = "MENU";
    this.currentMembership = null;
    this.onScreenChange?.(this.currentScreen);

    const mainMenu = new MainMenu({
      onCreateLobby: async (displayName: string) => {
        const membership = await this.services.lobby.createLobby({ displayName });
        this.currentMembership = membership;
        this.showLobby(membership.lobby, membership.playerId, membership.playerToken);
      },
      onJoinLobby: async (lobbyCode: string, displayName: string) => {
        const membership = await this.services.lobby.joinLobby(lobbyCode, { displayName });
        this.currentMembership = membership;
        this.showLobby(membership.lobby, membership.playerId, membership.playerToken);
      },
    });

    this.rootElement.innerHTML = "";
    this.rootElement.appendChild(mainMenu.getElement());
  }

  showLobby(lobby: Lobby, playerId: string, playerToken: string): void {
    this.cleanupActiveScreen();
    this.currentScreen = "LOBBY";
    this.onScreenChange?.(this.currentScreen);

    this.activeLobbyScreen = new LobbyScreen({
      lobby,
      playerId,
      playerToken,
      client: this.services.lobby,
      onLeave: () => {
        this.showMainMenu();
      },
      onSessionStarted: async (sessionDetails: SessionDetails) => {
        await this.handleSessionStarted(sessionDetails);
      },
    });

    this.rootElement.innerHTML = "";
    this.rootElement.appendChild(this.activeLobbyScreen.getElement());
  }

  private async handleSessionStarted(sessionDetails: SessionDetails): Promise<void> {
    this.cleanupActiveScreen();
    this.rootElement.innerHTML = "";

    const membership = this.currentMembership;
    const playerId = membership?.playerId || "";
    const slot = membership?.lobby.players.find((p) => p.playerId === playerId)?.slot ?? 0;

    // Record session in metadata service if caller is host
    if (membership && membership.lobby.hostPlayerId === playerId) {
      try {
        await this.services.metadata.createSessionRecord({
          sessionId: sessionDetails.sessionId,
          lobbyCode: sessionDetails.lobbyCode,
          hostPlayerId: sessionDetails.hostPlayerId,
          worldSeed: sessionDetails.worldConfig?.seed ?? 19842017,
          startedAt: sessionDetails.startedAt,
          participants: sessionDetails.players.map((p) => ({
            playerId: p.playerId,
            displayName: p.displayName,
            slot: p.slot,
          })),
        });
      } catch (err) {
        console.warn("Could not record session in metadata service:", err);
      }
    }

    // Call start game callback to load real world and avatar before transitioning screen state to GAME
    await this.onStartGameCallback({
      sessionDetails,
      slot,
      playerId,
    });

    if (this.currentScreen !== "MENU") {
      this.currentScreen = "GAME";
      this.onScreenChange?.(this.currentScreen);
    }
  }

  private cleanupActiveScreen(): void {
    if (this.activeLobbyScreen) {
      this.activeLobbyScreen.destroy();
      this.activeLobbyScreen = null;
    }
  }
}
