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

    const body = document.createElement("div");
    body.className = "toast-body";

    const header = document.createElement("div");
    header.className = "toast-header";

    const badge = document.createElement("span");
    badge.className = "toast-code-badge";
    badge.textContent = problem.code;

    const title = document.createElement("span");
    title.className = "toast-title";
    title.textContent = problem.title || "Request Failed";

    header.appendChild(badge);
    header.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "toast-desc";
    desc.textContent = formatProblemMessage(problem);

    body.appendChild(header);
    body.appendChild(desc);

    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => toast.remove());

    toast.appendChild(body);
    toast.appendChild(closeBtn);

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

    const message = error instanceof Error ? error.message : String(error);
    this.createSimpleToast("toast-error", "Error", message, 5000);
  }

  showSuccess(message: string, title = "Success"): void {
    this.createSimpleToast("toast-success", title, message, 4000);
  }

  showInfo(message: string, title = "Info"): void {
    this.createSimpleToast("toast-info", title, message, 4000);
  }

  private createSimpleToast(
    typeClass: string,
    titleText: string,
    messageText: string,
    durationMs: number,
  ): void {
    const container = this.ensureContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${typeClass}`;

    const body = document.createElement("div");
    body.className = "toast-body";

    const header = document.createElement("div");
    header.className = "toast-header";

    const title = document.createElement("span");
    title.className = "toast-title";
    title.textContent = titleText;

    header.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "toast-desc";
    desc.textContent = messageText;

    body.appendChild(header);
    body.appendChild(desc);

    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => toast.remove());

    toast.appendChild(body);
    toast.appendChild(closeBtn);

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, durationMs);
  }
}

export const toast = new ToastManager();
