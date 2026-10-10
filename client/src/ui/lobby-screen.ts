import type { Lobby } from "../shared/contracts/lobby";
import type { LobbyClient } from "../services/lobby-client";
import { ProblemError } from "../services/problem";
import { toast } from "./toast";

const SLOT_COLORS_HEX = ["#e4572e", "#2e86ab", "#f3a712", "#8e44ad", "#29bf12"];

export interface LobbyScreenOptions {
  lobby: Lobby;
  playerId: string;
  playerToken: string;
  client: LobbyClient;
  onLeave: () => void;
  onSessionStarted: (sessionDetails?: unknown) => void;
}

export class LobbyScreen {
  private element: HTMLElement;
  private lobby: Lobby;
  private playerId: string;
  private playerToken: string;
  private client: LobbyClient;
  private onLeave: () => void;
  private onSessionStarted: (sessionDetails?: unknown) => void;
  private pollIntervalId: number | null = null;
  private isStarting = false;
  private isLeaving = false;

  constructor(options: LobbyScreenOptions) {
    this.lobby = options.lobby;
    this.playerId = options.playerId;
    this.playerToken = options.playerToken;
    this.client = options.client;
    this.onLeave = options.onLeave;
    this.onSessionStarted = options.onSessionStarted;

    this.element = document.createElement("div");
    this.element.className = "ui-screen lobby-screen";

    this.render();
    this.startPolling();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollIntervalId = window.setInterval(async () => {
      try {
        const updated = await this.client.getLobby(this.lobby.lobbyCode, this.playerToken);
        this.lobby = updated;

        if (updated.status === "ENDED") {
          this.stopPolling();
          toast.showInfo(
            updated.endReason === "HOST_LEFT"
              ? "The host left the lobby."
              : "This lobby has ended.",
            "Lobby Closed",
          );
          this.onLeave();
          return;
        }

        if (updated.status === "IN_PROGRESS") {
          this.stopPolling();
          try {
            const session = await this.client.getSession(this.lobby.lobbyCode);
            this.onSessionStarted(session);
          } catch {
            this.onSessionStarted();
          }
          return;
        }

        this.updateView();
      } catch (err: unknown) {
        if (err instanceof ProblemError) {
          if (err.code === "INVALID_PLAYER_TOKEN" || err.code === "LOBBY_NOT_FOUND") {
            this.stopPolling();
            toast.showProblem(err.problem);
            this.onLeave();
          }
        }
      }
    }, 1000);
  }

  private stopPolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private isHost(): boolean {
    return this.lobby.hostPlayerId === this.playerId;
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="glass-panel lobby-panel">
        <div class="lobby-header-bar">
          <div class="lobby-code-box">
            <div>
              <div class="lobby-code-label">Lobby Code</div>
              <div class="lobby-code-tag" id="copy-code-btn" title="Click to copy code">
                ${this.lobby.lobbyCode}
              </div>
            </div>
          </div>
          <div>
            <span class="lobby-status-pill status-waiting">Waiting</span>
          </div>
        </div>

        <div class="slots-container" id="slots-container">
          <!-- Rendered in updateSlots() -->
        </div>

        ${
          this.isHost()
            ? `
          <div class="lobby-footer-actions">
            <button id="leave-btn" class="btn btn-secondary">Leave</button>
            <button id="start-btn" class="btn btn-accent">Start Session</button>
          </div>
          `
            : `
          <div class="waiting-message">Waiting for host to start the game...</div>
          <div class="lobby-footer-actions" style="margin-top: 12px;">
            <button id="leave-btn" class="btn btn-secondary">Leave Lobby</button>
          </div>
          `
        }
      </div>
    `;

    this.updateSlots();
    this.bindEvents();
  }

  private updateView(): void {
    this.updateSlots();
  }

  private updateSlots(): void {
    const container = this.element.querySelector("#slots-container");
    if (!container) return;

    const maxSlots = this.lobby.maxPlayers || 5;
    const playerMap = new Map(this.lobby.players.map((p) => [p.slot, p]));

    let slotsHtml = "";
    for (let slot = 0; slot < maxSlots; slot++) {
      const color = SLOT_COLORS_HEX[slot] || "#888888";
      const player = playerMap.get(slot);

      if (player) {
        const isHost = player.playerId === this.lobby.hostPlayerId;
        const isYou = player.playerId === this.playerId;

        slotsHtml += `
          <div class="slot-card is-occupied">
            <div class="slot-left">
              <div class="slot-avatar-dot" style="background-color: ${color};">
                ${slot + 1}
              </div>
              <div class="slot-name">${this.escapeHtml(player.displayName)}</div>
            </div>
            <div class="slot-badges">
              ${isHost ? '<span class="badge badge-host">Host</span>' : ""}
              ${isYou ? '<span class="badge badge-you">You</span>' : ""}
            </div>
          </div>
        `;
      } else {
        slotsHtml += `
          <div class="slot-card is-empty">
            <div class="slot-left">
              <div class="slot-avatar-dot" style="background-color: rgba(255, 255, 255, 0.1); color: #94a3b8;">
                ${slot + 1}
              </div>
              <div class="slot-name" style="color: #64748b; font-weight: 500;">Waiting for player...</div>
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = slotsHtml;
  }

  private bindEvents(): void {
    const copyBtn = this.element.querySelector<HTMLElement>("#copy-code-btn");
    copyBtn?.addEventListener("click", () => {
      void navigator.clipboard?.writeText(this.lobby.lobbyCode).then(() => {
        toast.showSuccess(`Copied code "${this.lobby.lobbyCode}" to clipboard!`, "Code Copied");
      });
    });

    const leaveBtn = this.element.querySelector<HTMLButtonElement>("#leave-btn");
    leaveBtn?.addEventListener("click", async () => {
      if (this.isLeaving) return;
      this.isLeaving = true;
      leaveBtn.disabled = true;
      this.stopPolling();

      try {
        await this.client.leaveLobby(this.lobby.lobbyCode, this.playerToken);
      } catch (err: unknown) {
        // Ignore or log error on leave
        console.warn("Error leaving lobby:", err);
      } finally {
        this.onLeave();
      }
    });

    const startBtn = this.element.querySelector<HTMLButtonElement>("#start-btn");
    startBtn?.addEventListener("click", async () => {
      if (this.isStarting || !this.isHost()) return;
      this.isStarting = true;
      startBtn.disabled = true;
      startBtn.textContent = "Starting...";

      try {
        const expectedPlayerIds = this.lobby.players.map((p) => p.playerId);
        const session = await this.client.startSession(this.lobby.lobbyCode, this.playerToken, {
          expectedPlayerIds,
        });
        this.stopPolling();
        this.onSessionStarted(session);
      } catch (err: unknown) {
        this.isStarting = false;
        startBtn.disabled = false;
        startBtn.textContent = "Start Session";
        if (err instanceof ProblemError) {
          toast.showProblem(err.problem);
        } else {
          toast.showError(err);
        }
      }
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
