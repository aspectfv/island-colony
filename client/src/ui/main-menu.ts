import { ProblemError } from "../services/problem";
import { toast } from "./toast";

export interface MainMenuCallbacks {
  onCreateLobby: (displayName: string) => Promise<void>;
  onJoinLobby: (lobbyCode: string, displayName: string) => Promise<void>;
  onOpenSettings: () => void;
}

export type MenuMode = "idle" | "create" | "join";

export class MainMenu {
  private element: HTMLElement;
  private mode: MenuMode = "idle";
  private isSubmitting = false;

  constructor(private callbacks: MainMenuCallbacks) {
    this.element = document.createElement("div");
    this.element.className = "ui-screen main-menu-screen";
    this.render();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private render(): void {
    const savedName = localStorage.getItem("island_colony_display_name") || "";

    this.element.innerHTML = `
      <div class="main-menu-container">
        <!-- Brand / Title Banner on Top Left -->
        <div class="menu-brand-header">
          <div class="brand-badge">ALPHA v0.1</div>
          <h1 class="ui-title">Island Colony</h1>
          <p class="ui-subtitle">Cooperative Low-Poly Island Builder</p>
        </div>

        <div class="main-menu-layout">
          <!-- Left Options Panel -->
          <div class="glass-panel menu-nav-panel">
            <div class="menu-nav-list">
              <button type="button" class="menu-nav-btn ${this.mode === "create" ? "is-selected" : ""}" id="nav-create-btn">
                <span class="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </span>
                <div class="nav-btn-text">
                  <span class="nav-btn-title">Create Lobby</span>
                  <span class="nav-btn-desc">Host a multiplayer colony</span>
                </div>
              </button>

              <button type="button" class="menu-nav-btn ${this.mode === "join" ? "is-selected" : ""}" id="nav-join-btn">
                <span class="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                </span>
                <div class="nav-btn-text">
                  <span class="nav-btn-title">Join Lobby</span>
                  <span class="nav-btn-desc">Connect with 6-letter lobby code</span>
                </div>
              </button>

              <button type="button" class="menu-nav-btn" id="nav-settings-btn">
                <span class="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </span>
                <div class="nav-btn-text">
                  <span class="nav-btn-title">Settings</span>
                  <span class="nav-btn-desc">Audio, graphics & controls</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Action Drawer / Form (Slides in next to menu) -->
          <div class="glass-panel menu-form-panel ${this.mode !== "idle" ? "is-visible" : "is-collapsed"}">
            <div class="form-header-bar">
              <h2 class="form-panel-title">
                ${this.mode === "create" ? "Create Lobby" : "Join Lobby"}
              </h2>
              <button type="button" class="btn-icon-close" id="form-dismiss-btn" title="Cancel">✕</button>
            </div>

            <form id="menu-action-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="player-name">Player Name</label>
                <input 
                  id="player-name" 
                  name="displayName" 
                  type="text" 
                  class="form-input" 
                  placeholder="e.g. Captain" 
                  value="${savedName}"
                  maxlength="16"
                  required
                  autocomplete="nickname"
                />
                <span class="field-error-msg" id="name-error" style="display: none;"></span>
              </div>

              ${
                this.mode === "join"
                  ? `
                <div class="form-group" id="join-code-group">
                  <label class="form-label" for="lobby-code">Lobby Code</label>
                  <input 
                    id="lobby-code" 
                    name="lobbyCode" 
                    type="text" 
                    class="form-input form-input-code" 
                    placeholder="K7QX2M" 
                    maxlength="6"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <span class="field-error-msg" id="code-error" style="display: none;"></span>
                </div>
              `
                  : ""
              }

              <button id="submit-btn" type="submit" class="btn ${this.mode === "create" ? "btn-accent" : "btn-primary"}">
                ${this.mode === "create" ? "Launch Lobby" : "Connect to Lobby"}
              </button>
            </form>
          </div>
        </div>

        <!-- Subtle scenic bottom hint -->
        <div class="menu-bottom-hint">
          <span>Explore and build together with up to 5 players</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const createBtn = this.element.querySelector<HTMLButtonElement>("#nav-create-btn");
    const joinBtn = this.element.querySelector<HTMLButtonElement>("#nav-join-btn");
    const settingsBtn = this.element.querySelector<HTMLButtonElement>("#nav-settings-btn");
    const dismissBtn = this.element.querySelector<HTMLButtonElement>("#form-dismiss-btn");

    createBtn?.addEventListener("click", () => {
      this.mode = "create";
      this.render();
      this.focusInput("#player-name");
    });

    joinBtn?.addEventListener("click", () => {
      this.mode = "join";
      this.render();
      const codeInput = this.element.querySelector<HTMLInputElement>("#lobby-code");
      const nameInput = this.element.querySelector<HTMLInputElement>("#player-name");
      if (nameInput?.value.trim()) {
        codeInput?.focus();
      } else {
        nameInput?.focus();
      }
    });

    settingsBtn?.addEventListener("click", () => {
      this.callbacks.onOpenSettings();
    });

    dismissBtn?.addEventListener("click", () => {
      this.mode = "idle";
      this.render();
    });

    const form = this.element.querySelector<HTMLFormElement>("#menu-action-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (this.isSubmitting) return;

      this.clearErrors();

      const nameInput = this.element.querySelector<HTMLInputElement>("#player-name");
      const codeInput = this.element.querySelector<HTMLInputElement>("#lobby-code");
      const name = nameInput?.value.trim() || "";

      if (!name) {
        this.showFieldError(
          "name-error",
          nameInput,
          "Please enter your name (1 to 16 characters).",
        );
        return;
      }

      localStorage.setItem("island_colony_display_name", name);
      this.setSubmitting(true);

      try {
        if (this.mode === "create") {
          await this.callbacks.onCreateLobby(name);
        } else if (this.mode === "join") {
          const code = codeInput?.value.trim().toUpperCase() || "";
          if (!code || code.length !== 6) {
            this.showFieldError("code-error", codeInput, "Lobby code must be 6 characters.");
            this.setSubmitting(false);
            return;
          }
          await this.callbacks.onJoinLobby(code, name);
        }
      } catch (err: unknown) {
        this.handleSubmitError(err);
      } finally {
        this.setSubmitting(false);
      }
    });
  }

  private focusInput(selector: string): void {
    requestAnimationFrame(() => {
      this.element.querySelector<HTMLInputElement>(selector)?.focus();
    });
  }

  private setSubmitting(submitting: boolean): void {
    this.isSubmitting = submitting;
    const btn = this.element.querySelector<HTMLButtonElement>("#submit-btn");
    if (btn) {
      btn.disabled = submitting;
      btn.textContent = submitting
        ? "Please wait..."
        : this.mode === "create"
          ? "Launch Lobby"
          : "Connect to Lobby";
    }
  }

  private showFieldError(errorId: string, input: HTMLInputElement | null, message: string): void {
    if (input) input.classList.add("is-invalid");
    const errorEl = this.element.querySelector<HTMLElement>(`#${errorId}`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = "block";
    }
  }

  private clearErrors(): void {
    this.element.querySelectorAll(".form-input").forEach((el) => el.classList.remove("is-invalid"));
    this.element.querySelectorAll<HTMLElement>(".field-error-msg").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
  }

  private handleSubmitError(err: unknown): void {
    if (err instanceof ProblemError) {
      if (err.code === "VALIDATION_FAILED" && err.problem.errors) {
        for (const fe of err.problem.errors) {
          if (fe.field.includes("displayName")) {
            const nameInput = this.element.querySelector<HTMLInputElement>("#player-name");
            this.showFieldError("name-error", nameInput, fe.message);
          }
          if (fe.field.includes("lobbyCode")) {
            const codeInput = this.element.querySelector<HTMLInputElement>("#lobby-code");
            this.showFieldError("code-error", codeInput, fe.message);
          }
        }
      }
      toast.showProblem(err.problem);
    } else {
      toast.showError(err);
    }
  }
}
