import type { Lobby, LobbyMembership, SessionDetails } from "../shared/contracts/lobby";
import type { SessionSummary } from "../shared/contracts/metadata";
import type { Services } from "../services/service-factory";
import { InGameMenu } from "./in-game-menu";
import { LobbyScreen } from "./lobby-screen";
import { MainMenu } from "./main-menu";
import "./styles.css";

export interface GameStartPayload {
  sessionDetails: SessionDetails;
  slot: number;
  playerId: string;
}

export type ScreenState = "MENU" | "LOBBY" | "GAME";

export interface UIManagerOptions {
  startInMenu?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
  onLeaveGame?: () => void | Promise<void>;
  onEndSession?: () => void | Promise<void>;
}

export class UIManager {
  private rootElement: HTMLElement;
  private currentScreen: ScreenState = "MENU";
  private activeLobbyScreen: LobbyScreen | null = null;
  private activeInGameMenu: InGameMenu | null = null;
  private currentMembership: LobbyMembership | null = null;
  private currentSessionDetails: SessionDetails | null = null;

  constructor(
    private services: Services,
    private onStartGameCallback: (payload: GameStartPayload) => void | Promise<void>,
    private onScreenChange?: (screen: ScreenState) => void,
    private options?: UIManagerOptions,
  ) {
    let root = document.getElementById("ui-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ui-root";
      document.body.appendChild(root);
    }
    this.rootElement = root;
    if (this.options?.startInMenu !== false) {
      this.showMainMenu();
    }
  }

  getScreenState(): ScreenState {
    return this.currentScreen;
  }

  isMenuOpen(): boolean {
    return this.activeInGameMenu?.isOpen() ?? false;
  }

  showMainMenu(): void {
    this.cleanupActiveScreen();
    this.currentScreen = "MENU";
    this.currentMembership = null;
    this.currentSessionDetails = null;
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

  enterLocalGame(isHost = true): void {
    this.cleanupActiveScreen();
    this.currentScreen = "GAME";
    this.onScreenChange?.(this.currentScreen);
    this.mountInGameMenu(isHost);
  }

  private async handleSessionStarted(sessionDetails: SessionDetails): Promise<void> {
    this.cleanupActiveScreen();
    this.rootElement.innerHTML = "";
    this.currentSessionDetails = sessionDetails;

    const membership = this.currentMembership;
    const playerId = membership?.playerId || "";
    const slot = membership?.lobby.players.find((p) => p.playerId === playerId)?.slot ?? 0;
    const isHost = Boolean(
      (membership && membership.lobby.hostPlayerId === playerId) ||
      (playerId && sessionDetails.hostPlayerId === playerId),
    );

    // Record session in metadata service if caller is host
    if (isHost) {
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
      this.mountInGameMenu(isHost);
    }
  }

  private mountInGameMenu(isHost: boolean): void {
    this.activeInGameMenu = new InGameMenu({
      isHost,
      onResume: () => {
        // Resuming closes the menu and fires onOpenChange(false)
      },
      onLeaveGame: async () => {
        await this.handleLeaveGame();
      },
      onEndSession: async () => {
        await this.handleEndSession();
      },
      onOpenChange: (isOpen) => {
        this.options?.onMenuOpenChange?.(isOpen);
      },
    });

    this.rootElement.innerHTML = "";
    this.rootElement.appendChild(this.activeInGameMenu.getElement());
  }

  private async handleLeaveGame(): Promise<void> {
    const membership = this.currentMembership;

    await this.options?.onLeaveGame?.();

    if (membership) {
      try {
        await this.services.lobby.leaveLobby(
          membership.lobby.lobbyCode,
          membership.playerId,
          membership.playerToken,
        );
      } catch (err) {
        console.warn("Error leaving lobby:", err);
      }
    }

    this.showMainMenu();
  }

  private async handleEndSession(): Promise<void> {
    const membership = this.currentMembership;
    const sessionDetails = this.currentSessionDetails;

    await this.options?.onEndSession?.();

    if (membership && sessionDetails && membership.lobby.hostPlayerId === membership.playerId) {
      const summary: SessionSummary = {
        outcome: "HOST_ENDED",
        endedAt: new Date().toISOString(),
        objectivesCompleted: 0,
        structures: [],
        totalGathered: {},
        contributions: sessionDetails.players.map((p) => ({
          playerId: p.playerId,
          gathered: {},
          structuresPlaced: 0,
        })),
      };

      try {
        await this.services.metadata.recordSessionSummary(sessionDetails.sessionId, summary);
      } catch (err) {
        console.warn("Could not record session summary in metadata service:", err);
      }

      try {
        await this.services.lobby.endSession(sessionDetails.lobbyCode, membership.playerToken, {
          reason: "HOST_ENDED",
        });
      } catch (err) {
        console.warn("Could not end session in lobby service:", err);
      }
    }

    this.showMainMenu();
  }

  private cleanupActiveScreen(): void {
    if (this.activeLobbyScreen) {
      this.activeLobbyScreen.destroy();
      this.activeLobbyScreen = null;
    }
    if (this.activeInGameMenu) {
      this.activeInGameMenu.destroy();
      this.activeInGameMenu = null;
    }
  }
}
