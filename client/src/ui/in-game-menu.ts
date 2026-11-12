export interface InGameMenuOptions {
  isHost: boolean;
  onResume: () => void;
  onLeaveGame: () => void | Promise<void>;
  onEndSession?: () => void | Promise<void>;
  onOpenChange?: (isOpen: boolean) => void;
}

export class InGameMenu {
  private readonly element: HTMLElement;
  private readonly mainActions: HTMLElement;
  private readonly resumeBtn: HTMLButtonElement;
  private readonly leaveBtn: HTMLButtonElement;
  private readonly confirmSection: HTMLElement | null = null;
  private readonly endSessionBtn: HTMLButtonElement | null = null;
  private readonly cancelLeaveBtn: HTMLButtonElement | null = null;
  private open = false;
  private confirmingLeave = false;
  private disposed = false;
  private isSubmitting = false;
  private wasPointerLocked = false;
  private openedByPointerLockExitAt = -Infinity;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.disposed || this.isSubmitting) return;
    if (event.code !== "Escape" || event.repeat) return;

    event.preventDefault();
    if (!this.open) {
      this.show();
    } else if (performance.now() - this.openedByPointerLockExitAt >= 100) {
      this.resume();
    }
  };

  private readonly handlePointerLockChange = (): void => {
    if (this.disposed || this.isSubmitting) return;

    const locked = Boolean(document.pointerLockElement);
    if (locked) {
      this.wasPointerLocked = true;
      return;
    }

    if (this.wasPointerLocked) {
      this.wasPointerLocked = false;
      if (!this.open) {
        this.openedByPointerLockExitAt = performance.now();
        this.show();
      }
    }
  };

  constructor(private readonly options: InGameMenuOptions) {
    this.element = document.createElement("div");
    this.element.className = "ui-screen in-game-menu-overlay";
    this.element.hidden = true;

    const panel = document.createElement("div");
    panel.className = "glass-panel in-game-menu-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "in-game-menu-title");

    const title = document.createElement("h2");
    title.className = "in-game-menu-title";
    title.id = "in-game-menu-title";
    title.textContent = "Game Paused";

    const subtitle = document.createElement("p");
    subtitle.className = "in-game-menu-subtitle";
    subtitle.textContent = "Press Esc to resume";

    this.mainActions = document.createElement("div");
    this.mainActions.className = "in-game-menu-actions";

    this.resumeBtn = document.createElement("button");
    this.resumeBtn.type = "button";
    this.resumeBtn.id = "ingame-resume-btn";
    this.resumeBtn.className = "btn btn-primary";
    this.resumeBtn.textContent = "Resume";
    this.resumeBtn.addEventListener("click", () => {
      this.resume();
    });

    this.leaveBtn = document.createElement("button");
    this.leaveBtn.type = "button";
    this.leaveBtn.id = "ingame-leave-btn";
    this.leaveBtn.className = "btn btn-secondary";
    this.leaveBtn.textContent = "Leave Game";
    this.leaveBtn.addEventListener("click", () => {
      if (this.options.isHost) {
        this.setConfirmingLeave(true);
      } else {
        void this.handleLeaveClick();
      }
    });

    this.mainActions.appendChild(this.resumeBtn);
    this.mainActions.appendChild(this.leaveBtn);

    panel.appendChild(title);
    panel.appendChild(subtitle);
    panel.appendChild(this.mainActions);

    if (this.options.isHost) {
      this.confirmSection = document.createElement("div");
      this.confirmSection.id = "ingame-host-confirm";
      this.confirmSection.className = "in-game-menu-confirm";
      this.confirmSection.hidden = true;

      const warning = document.createElement("p");
      warning.id = "ingame-host-warning";
      warning.className = "in-game-menu-warning";
      warning.textContent = "When the host leaves, the session will end for everyone.";

      const confirmActions = document.createElement("div");
      confirmActions.className = "in-game-menu-actions";

      this.endSessionBtn = document.createElement("button");
      this.endSessionBtn.type = "button";
      this.endSessionBtn.id = "ingame-end-session-btn";
      this.endSessionBtn.className = "btn btn-danger";
      this.endSessionBtn.textContent = "End Session for Everyone";
      this.endSessionBtn.addEventListener("click", () => {
        void this.handleEndSessionClick();
      });

      this.cancelLeaveBtn = document.createElement("button");
      this.cancelLeaveBtn.type = "button";
      this.cancelLeaveBtn.id = "ingame-cancel-leave-btn";
      this.cancelLeaveBtn.className = "btn btn-secondary";
      this.cancelLeaveBtn.textContent = "Cancel";
      this.cancelLeaveBtn.addEventListener("click", () => {
        this.setConfirmingLeave(false);
      });

      confirmActions.appendChild(this.endSessionBtn);
      confirmActions.appendChild(this.cancelLeaveBtn);
      this.confirmSection.appendChild(warning);
      this.confirmSection.appendChild(confirmActions);
      panel.appendChild(this.confirmSection);
    }

    this.element.appendChild(panel);

    this.wasPointerLocked = typeof document !== "undefined" && Boolean(document.pointerLockElement);
    window.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  isOpen(): boolean {
    return this.open;
  }

  isConfirmingLeave(): boolean {
    return this.confirmingLeave;
  }

  show(): void {
    if (this.disposed || this.open) return;
    this.open = true;
    this.wasPointerLocked = false;
    this.setConfirmingLeave(false);

    if (typeof document !== "undefined" && document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore in restricted environments
      }
    }

    this.element.hidden = false;
    this.element.classList.add("is-open");
    this.options.onOpenChange?.(true);
    this.resumeBtn.focus?.();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.setConfirmingLeave(false);
    this.element.classList.remove("is-open");
    this.element.hidden = true;
    this.options.onOpenChange?.(false);
  }

  resume(): void {
    if (this.disposed || this.isSubmitting || !this.open) return;
    this.hide();
    this.options.onResume();
  }

  destroy(): void {
    this.disposed = true;
    this.open = false;
    window.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("pointerlockchange", this.handlePointerLockChange);
    this.element.remove();
  }

  private setConfirmingLeave(confirming: boolean): void {
    if (this.disposed || this.isSubmitting) return;
    this.confirmingLeave = confirming;
    this.mainActions.hidden = confirming;
    if (this.confirmSection) {
      this.confirmSection.hidden = !confirming;
    }
  }

  private async handleLeaveClick(): Promise<void> {
    if (this.disposed || this.isSubmitting) return;
    this.setSubmitting(true, "leave");
    try {
      await this.options.onLeaveGame();
    } finally {
      if (!this.disposed) {
        this.setSubmitting(false);
      }
    }
  }

  private async handleEndSessionClick(): Promise<void> {
    if (this.disposed || this.isSubmitting || !this.options.isHost) return;
    this.setSubmitting(true, "end");
    try {
      if (this.options.onEndSession) {
        await this.options.onEndSession();
      } else {
        await this.options.onLeaveGame();
      }
    } finally {
      if (!this.disposed) {
        this.setSubmitting(false);
      }
    }
  }

  private setSubmitting(submitting: boolean, action?: "leave" | "end"): void {
    this.isSubmitting = submitting;
    this.resumeBtn.disabled = submitting;
    this.leaveBtn.disabled = submitting;
    this.leaveBtn.textContent = submitting && action === "leave" ? "Leaving..." : "Leave Game";

    if (this.endSessionBtn) {
      this.endSessionBtn.disabled = submitting;
      this.endSessionBtn.textContent =
        submitting && action === "end" ? "Ending Session..." : "End Session for Everyone";
    }
    if (this.cancelLeaveBtn) {
      this.cancelLeaveBtn.disabled = submitting;
    }
  }
}
