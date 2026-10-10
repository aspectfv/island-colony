export interface GameSettings {
  masterVolume: number;
  sfxMuted: boolean;
  shadowsEnabled: boolean;
  showFps: boolean;
}

const SETTINGS_KEY = "island_colony_settings";

const defaultSettings: GameSettings = {
  masterVolume: 80,
  sfxMuted: false,
  shadowsEnabled: true,
  showFps: false,
};

export class SettingsModal {
  private element: HTMLElement;
  private settings: GameSettings;

  constructor(
    private onClose: () => void,
    private onSettingsChanged?: (settings: GameSettings) => void,
  ) {
    this.settings = this.loadSettings();
    this.element = document.createElement("div");
    this.element.className = "modal-backdrop settings-modal-backdrop";
    this.render();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private loadSettings(): GameSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback to default
    }
    return { ...defaultSettings };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      if (this.onSettingsChanged) {
        this.onSettingsChanged(this.settings);
      }
    } catch {
      // ignore
    }
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="glass-panel modal-panel settings-panel">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </span>
            <h2 class="modal-title">Settings</h2>
          </div>
          <button type="button" class="modal-close-btn" id="settings-close-btn" aria-label="Close settings">✕</button>
        </div>

        <div class="settings-content">
          <!-- Audio Section -->
          <div class="settings-group">
            <h3 class="settings-group-title">Audio</h3>
            <div class="setting-row">
              <label class="setting-label" for="setting-volume">Master Volume</label>
              <div class="setting-control-slider">
                <input 
                  type="range" 
                  id="setting-volume" 
                  min="0" 
                  max="100" 
                  value="${this.settings.masterVolume}" 
                  class="slider-input" 
                />
                <span class="slider-val" id="volume-val">${this.settings.masterVolume}%</span>
              </div>
            </div>

            <div class="setting-row">
              <label class="setting-label" for="setting-sfx-mute">Mute Sound Effects</label>
              <label class="switch">
                <input type="checkbox" id="setting-sfx-mute" ${this.settings.sfxMuted ? "checked" : ""} />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- Graphics & Dev Section -->
          <div class="settings-group">
            <h3 class="settings-group-title">Graphics & Performance</h3>
            <div class="setting-row">
              <label class="setting-label" for="setting-shadows">Dynamic Shadows</label>
              <label class="switch">
                <input type="checkbox" id="setting-shadows" ${this.settings.shadowsEnabled ? "checked" : ""} />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <label class="setting-label" for="setting-fps">Performance Stats (FPS)</label>
              <label class="switch">
                <input type="checkbox" id="setting-fps" ${this.settings.showFps ? "checked" : ""} />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <!-- Controls Guide Section -->
          <div class="settings-group">
            <h3 class="settings-group-title">Controls Guide</h3>
            <div class="controls-guide-grid">
              <div class="control-key-item">
                <kbd class="key-cap">W</kbd><kbd class="key-cap">A</kbd><kbd class="key-cap">S</kbd><kbd class="key-cap">D</kbd>
                <span class="control-desc">Move Avatar</span>
              </div>
              <div class="control-key-item">
                <kbd class="key-cap">Mouse</kbd>
                <span class="control-desc">Orbit Camera (Click to lock)</span>
              </div>
              <div class="control-key-item">
                <kbd class="key-cap">Esc</kbd>
                <span class="control-desc">Release Mouse Lock</span>
              </div>
              <div class="control-key-item">
                <kbd class="key-cap">E</kbd>
                <span class="control-desc">Gather / Build Action</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="settings-save-btn">Done</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const closeBtn = this.element.querySelector<HTMLButtonElement>("#settings-close-btn");
    const saveBtn = this.element.querySelector<HTMLButtonElement>("#settings-save-btn");
    const volumeSlider = this.element.querySelector<HTMLInputElement>("#setting-volume");
    const volumeVal = this.element.querySelector<HTMLElement>("#volume-val");
    const sfxMute = this.element.querySelector<HTMLInputElement>("#setting-sfx-mute");
    const shadows = this.element.querySelector<HTMLInputElement>("#setting-shadows");
    const fps = this.element.querySelector<HTMLInputElement>("#setting-fps");

    closeBtn?.addEventListener("click", () => this.onClose());
    saveBtn?.addEventListener("click", () => this.onClose());

    volumeSlider?.addEventListener("input", () => {
      const val = parseInt(volumeSlider.value, 10) || 0;
      this.settings.masterVolume = val;
      if (volumeVal) volumeVal.textContent = `${val}%`;
      this.saveSettings();
    });

    sfxMute?.addEventListener("change", () => {
      this.settings.sfxMuted = sfxMute.checked;
      this.saveSettings();
    });

    shadows?.addEventListener("change", () => {
      this.settings.shadowsEnabled = shadows.checked;
      this.saveSettings();
    });

    fps?.addEventListener("change", () => {
      this.settings.showFps = fps.checked;
      this.saveSettings();
    });

    // Close when clicking on backdrop outside modal panel
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.onClose();
      }
    });
  }
}
