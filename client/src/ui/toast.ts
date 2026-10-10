import type { Problem } from "../shared/contracts/common";
import { formatProblemMessage, ProblemError } from "../services/problem";

class ToastManager {
  private container: HTMLElement | null = null;

  private ensureContainer(): HTMLElement {
    if (!this.container) {
      let el = document.getElementById("toast-container");
      if (!el) {
        el = document.createElement("div");
        el.id = "toast-container";
        document.body.appendChild(el);
      }
      this.container = el;
    }
    return this.container;
  }

  showProblem(problem: Problem): void {
    const container = this.ensureContainer();
    const toast = document.createElement("div");
    toast.className = "toast toast-error";

    const friendlyMessage = formatProblemMessage(problem);

    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-header">
          <span class="toast-code-badge">${problem.code}</span>
          <span class="toast-title">${problem.title || "Request Failed"}</span>
        </div>
        <p class="toast-desc">${friendlyMessage}</p>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => toast.remove());

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 6000);
  }

  showError(error: unknown): void {
    if (error instanceof ProblemError) {
      this.showProblem(error.problem);
      return;
    }

    const container = this.ensureContainer();
    const toast = document.createElement("div");
    toast.className = "toast toast-error";
    const message = error instanceof Error ? error.message : String(error);

    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-header">
          <span class="toast-title">Error</span>
        </div>
        <p class="toast-desc">${message}</p>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => toast.remove());

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);
  }

  showSuccess(message: string, title = "Success"): void {
    const container = this.ensureContainer();
    const toast = document.createElement("div");
    toast.className = "toast toast-success";

    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-header">
          <span class="toast-title">${title}</span>
        </div>
        <p class="toast-desc">${message}</p>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => toast.remove());

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  }

  showInfo(message: string, title = "Info"): void {
    const container = this.ensureContainer();
    const toast = document.createElement("div");
    toast.className = "toast toast-info";

    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-header">
          <span class="toast-title">${title}</span>
        </div>
        <p class="toast-desc">${message}</p>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => toast.remove());

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  }
}

export const toast = new ToastManager();
