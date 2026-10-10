import type { Lobby, SessionDetails } from "../shared/contracts/lobby";
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
  onSessionStarted: (sessionDetails: SessionDetails) => void;
}

export class LobbyScreen {
  private element: HTMLElement;
  private lobby: Lobby;
  private playerId: string;
  private playerToken: string;
  private client: LobbyClient;
  private onLeave: () => void;
  private onSessionStarted: (sessionDetails: SessionDetails) => void;
  private pollTimeoutId: number | null = null;
  private disposed = false;
  private isStarting = false;
  private isLeaving = false;
  private isTickInFlight = false;

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
    this.schedulePoll(1000);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.disposed = true;
    this.stopPolling();
  }

  private schedulePoll(delayMs = 1000): void {
    if (this.disposed || this.isStarting || this.isLeaving) return;
    this.stopPolling();
    this.pollTimeoutId = window.setTimeout(() => {
      void this.pollTick();
    }, delayMs);
  }

  private stopPolling(): void {
    if (this.pollTimeoutId !== null) {
      clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = null;
    }
  }

  private async pollTick(): Promise<void> {
    if (this.disposed || this.isStarting || this.isLeaving || this.isTickInFlight) return;
    this.isTickInFlight = true;

    try {
      const updated = await this.client.getLobby(this.lobby.lobbyCode, this.playerToken);
      if (this.disposed || this.isStarting || this.isLeaving) return;

      this.lobby = updated;

      if (updated.status === "ENDED") {
        this.disposed = true;
        this.stopPolling();
        toast.showInfo(
          updated.endReason === "HOST_LEFT" ? "The host left the lobby." : "This lobby has ended.",
          "Lobby Closed",
        );
        this.onLeave();
        return;
      }

      if (updated.status === "IN_PROGRESS") {
        try {
          const session = await this.client.getSession(this.lobby.lobbyCode);
          if (this.disposed || this.isStarting || this.isLeaving) return;

          this.disposed = true;
          this.stopPolling();
          this.onSessionStarted(session);
          return;
        } catch {
          if (this.disposed || this.isStarting || this.isLeaving) return;
          // Session is starting but details are not ready yet; retry on next tick
          this.schedulePoll(1000);
          return;
        }
      }

      this.updateView();
    } catch (err: unknown) {
      if (this.disposed || this.isStarting || this.isLeaving) return;
      if (err instanceof ProblemError) {
        if (err.code === "INVALID_PLAYER_TOKEN" || err.code === "LOBBY_NOT_FOUND") {
          this.disposed = true;
          this.stopPolling();
          toast.showProblem(err.problem);
          this.onLeave();
          return;
        }
      }
    } finally {
      this.isTickInFlight = false;
      if (!this.disposed && !this.isStarting && !this.isLeaving) {
        this.schedulePoll(1000);
      }
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
              <div class="lobby-code-tag" id="copy-code-btn" title="Click to copy code"></div>
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

    const copyBtn = this.element.querySelector<HTMLElement>("#copy-code-btn");
    if (copyBtn) {
      copyBtn.textContent = this.lobby.lobbyCode;
    }

    this.updateSlots();
    this.bindEvents();
  }

  private updateView(): void {
    this.updateSlots();
  }

  private updateSlots(): void {
    const container = this.element.querySelector("#slots-container");
    if (!container) return;

    container.innerHTML = "";

    const maxSlots = this.lobby.maxPlayers || 5;
    const playerMap = new Map(this.lobby.players.map((p) => [p.slot, p]));

    for (let slot = 0; slot < maxSlots; slot++) {
      const color = SLOT_COLORS_HEX[slot] || "#888888";
      const player = playerMap.get(slot);

      const slotCard = document.createElement("div");

      if (player) {
        const isHost = player.playerId === this.lobby.hostPlayerId;
        const isYou = player.playerId === this.playerId;

        slotCard.className = "slot-card is-occupied";

        const slotLeft = document.createElement("div");
        slotLeft.className = "slot-left";

        const dot = document.createElement("div");
        dot.className = "slot-avatar-dot";
        dot.style.backgroundColor = color;
        dot.textContent = String(slot + 1);

        const nameEl = document.createElement("div");
        nameEl.className = "slot-name";
        nameEl.textContent = player.displayName;

        slotLeft.appendChild(dot);
        slotLeft.appendChild(nameEl);

        const badges = document.createElement("div");
        badges.className = "slot-badges";

        if (isHost) {
          const hostBadge = document.createElement("span");
          hostBadge.className = "badge badge-host";
          hostBadge.textContent = "Host";
          badges.appendChild(hostBadge);
        }

        if (isYou) {
          const youBadge = document.createElement("span");
          youBadge.className = "badge badge-you";
          youBadge.textContent = "You";
          badges.appendChild(youBadge);
        }

        slotCard.appendChild(slotLeft);
        slotCard.appendChild(badges);
      } else {
        slotCard.className = "slot-card is-empty";

        const slotLeft = document.createElement("div");
        slotLeft.className = "slot-left";

        const dot = document.createElement("div");
        dot.className = "slot-avatar-dot";
        dot.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        dot.style.color = "#94a3b8";
        dot.textContent = String(slot + 1);

        const nameEl = document.createElement("div");
        nameEl.className = "slot-name";
        nameEl.style.color = "#64748b";
        nameEl.style.fontWeight = "500";
        nameEl.textContent = "Waiting for player...";

        slotLeft.appendChild(dot);
        slotLeft.appendChild(nameEl);
        slotCard.appendChild(slotLeft);
      }

      container.appendChild(slotCard);
    }
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
      if (this.isLeaving || this.disposed) return;
      this.isLeaving = true;
      leaveBtn.disabled = true;
      this.stopPolling();

      try {
        await this.client.leaveLobby(this.lobby.lobbyCode, this.playerId, this.playerToken);
      } catch (err: unknown) {
        console.warn("Error leaving lobby:", err);
      } finally {
        this.disposed = true;
        this.onLeave();
      }
    });

    const startBtn = this.element.querySelector<HTMLButtonElement>("#start-btn");
    startBtn?.addEventListener("click", async () => {
      if (this.isStarting || !this.isHost() || this.disposed) return;
      this.isStarting = true;
      startBtn.disabled = true;
      startBtn.textContent = "Starting...";
      this.stopPolling();

      try {
        const expectedPlayerIds = this.lobby.players.map((p) => p.playerId);
        const session = await this.client.startSession(this.lobby.lobbyCode, this.playerToken, {
          expectedPlayerIds,
        });

        if (this.disposed) return;

        this.disposed = true;
        this.onSessionStarted(session);
      } catch (err: unknown) {
        if (this.disposed) return;
        this.isStarting = false;
        startBtn.disabled = false;
        startBtn.textContent = "Start Session";
        this.schedulePoll(1000);

        if (err instanceof ProblemError) {
          toast.showProblem(err.problem);
        } else {
          toast.showError(err);
        }
      }
    });
  }
}
