import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InGameMenu } from "./in-game-menu";

class FakeElement {
  tagName: string;
  id = "";
  className = "";
  textContent = "";
  type = "";
  hidden = false;
  disabled = false;
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  private attributes = new Map<string, string>();
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  readonly classList = {
    add: (...tokens: string[]) => {
      const current = new Set(this.className.split(/\s+/).filter(Boolean));
      for (const token of tokens) current.add(token);
      this.className = [...current].join(" ");
    },
    remove: (...tokens: string[]) => {
      const current = new Set(this.className.split(/\s+/).filter(Boolean));
      for (const token of tokens) current.delete(token);
      this.className = [...current].join(" ");
    },
    contains: (token: string) => this.className.split(/\s+/).filter(Boolean).includes(token),
  };

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  appendChild(child: FakeElement): FakeElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove(): void {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
    this.parentElement = null;
  }

  addEventListener(type: string, listener: (...args: unknown[]) => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  click(): void {
    if (this.disabled) return;
    for (const listener of this.listeners.get("click") ?? []) {
      listener({ preventDefault: () => {} });
    }
  }

  focus(): void {}

  querySelector(selector: string): FakeElement | null {
    for (const child of this.children) {
      if (matchesSelector(child, selector)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}

function matchesSelector(el: FakeElement, selector: string): boolean {
  if (selector.startsWith("#")) {
    return el.id === selector.slice(1);
  }
  if (selector.startsWith(".")) {
    return el.classList.contains(selector.slice(1));
  }
  return el.tagName.toLowerCase() === selector.toLowerCase();
}

class EventTargetStub {
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  addEventListener(type: string, listener: (event: unknown) => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(type: string, event: unknown = {}): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }
}

describe("InGameMenu", () => {
  let windowStub: EventTargetStub;
  let documentStub: EventTargetStub & {
    pointerLockElement: unknown;
    exitPointerLock: ReturnType<typeof vi.fn>;
    createElement: (tag: string) => FakeElement;
  };

  beforeEach(() => {
    windowStub = new EventTargetStub();
    const docTarget = new EventTargetStub();
    documentStub = Object.assign(docTarget, {
      pointerLockElement: null as unknown,
      exitPointerLock: vi.fn(() => {
        documentStub.pointerLockElement = null;
      }),
      createElement: (tag: string) => new FakeElement(tag),
    });

    vi.stubGlobal("window", windowStub);
    vi.stubGlobal("document", documentStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pressEscape = () => {
    windowStub.dispatchEvent("keydown", {
      code: "Escape",
      repeat: false,
      preventDefault: vi.fn(),
    });
  };

  it("opens on Esc, releases captured mouse, and resumes on second Esc or Resume click", () => {
    documentStub.pointerLockElement = { id: "game" };
    const onResume = vi.fn();
    const onOpenChange = vi.fn();

    const menu = new InGameMenu({
      isHost: false,
      onResume,
      onLeaveGame: vi.fn(),
      onOpenChange,
    });

    expect(menu.isOpen()).toBe(false);
    expect(menu.getElement().hidden).toBe(true);

    // Press Esc to open menu
    pressEscape();

    expect(menu.isOpen()).toBe(true);
    expect(menu.getElement().hidden).toBe(false);
    expect(documentStub.exitPointerLock).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    // Press Esc again to resume
    pressEscape();

    expect(menu.isOpen()).toBe(false);
    expect(menu.getElement().hidden).toBe(true);
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    // Reopen and click Resume button
    pressEscape();
    expect(menu.isOpen()).toBe(true);
    const resumeBtn = (menu.getElement() as unknown as FakeElement).querySelector(
      "#ingame-resume-btn",
    );
    resumeBtn?.click();

    expect(menu.isOpen()).toBe(false);
    expect(onResume).toHaveBeenCalledTimes(2);

    menu.destroy();
  });

  it("opens when browser exits pointer lock on Esc and ignores duplicate keydown in the same frame", () => {
    const menu = new InGameMenu({
      isHost: false,
      onResume: vi.fn(),
      onLeaveGame: vi.fn(),
    });

    // Lock pointer on canvas
    documentStub.pointerLockElement = { id: "game" };
    documentStub.dispatchEvent("pointerlockchange");

    // Browser exits pointer lock when user hits Esc
    documentStub.pointerLockElement = null;
    documentStub.dispatchEvent("pointerlockchange");

    expect(menu.isOpen()).toBe(true);

    // Immediate Escape keydown from the same press must not close the menu
    pressEscape();
    expect(menu.isOpen()).toBe(true);

    menu.destroy();
  });

  it("leaves immediately when a non-host clicks Leave Game", () => {
    const onLeaveGame = vi.fn();
    const menu = new InGameMenu({
      isHost: false,
      onResume: vi.fn(),
      onLeaveGame,
    });

    const root = menu.getElement() as unknown as FakeElement;
    expect(root.querySelector("#ingame-resume-btn")).not.toBeNull();
    expect(root.querySelector("#ingame-leave-btn")).not.toBeNull();
    expect(root.querySelector("#ingame-host-confirm")).toBeNull();

    menu.show();
    root.querySelector("#ingame-leave-btn")?.click();
    expect(onLeaveGame).toHaveBeenCalledTimes(1);

    menu.destroy();
  });

  it("shows a confirmation warning when the host clicks Leave Game before ending the session for everyone", () => {
    const onEndSession = vi.fn();
    const onLeaveGame = vi.fn();
    const menu = new InGameMenu({
      isHost: true,
      onResume: vi.fn(),
      onLeaveGame,
      onEndSession,
    });

    const root = menu.getElement() as unknown as FakeElement;
    const confirmSection = root.querySelector("#ingame-host-confirm");
    const warning = root.querySelector("#ingame-host-warning");
    const endBtn = root.querySelector("#ingame-end-session-btn");
    const cancelBtn = root.querySelector("#ingame-cancel-leave-btn");

    menu.show();

    // Initially only Resume and Leave Game are shown; confirmation is hidden
    expect(menu.isConfirmingLeave()).toBe(false);
    expect(confirmSection?.hidden).toBe(true);

    // Clicking Leave Game as host shows confirmation warning instead of leaving immediately
    root.querySelector("#ingame-leave-btn")?.click();
    expect(menu.isConfirmingLeave()).toBe(true);
    expect(confirmSection?.hidden).toBe(false);
    expect(warning?.textContent).toContain("session will end for everyone");
    expect(onEndSession).not.toHaveBeenCalled();
    expect(onLeaveGame).not.toHaveBeenCalled();

    // Clicking Cancel returns to the 2-option menu
    cancelBtn?.click();
    expect(menu.isConfirmingLeave()).toBe(false);
    expect(confirmSection?.hidden).toBe(true);

    // Clicking Leave Game -> Confirm (End Session for Everyone) triggers onEndSession
    root.querySelector("#ingame-leave-btn")?.click();
    endBtn?.click();
    expect(onEndSession).toHaveBeenCalledTimes(1);

    menu.destroy();
  });
});
