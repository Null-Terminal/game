import "#game/menu/settings";

import { cache } from "#/utils/decorators/cache";
import { MenuActions } from "#game/menu/actions";
import { MenuInput } from "#game/menu/input";

import styles from "#game/menu/styles.css?raw";
import template from "#game/menu/template.html?raw";

import type { Subscription } from "#lib/event-emitter";
import type { Game } from "#engine/game";
import type { GameSettingsPanel } from "#game/menu/settings";
import type { ProjectSettings } from "#game/settings";

export class GameMenu extends HTMLElement {
  game: Game<ProjectSettings> | null = null;

  @cache
  get menuScreen() {
    return this.shadowRoot!.getElementById("menu-screen")!;
  }

  @cache
  get settingsScreen() {
    return this.shadowRoot!.getElementById("settings-screen")!;
  }

  @cache
  get startButton() {
    return this.shadowRoot!.getElementById("start") as HTMLButtonElement;
  }

  @cache
  get settingsButton() {
    return this.shadowRoot!.getElementById("settings") as HTMLButtonElement;
  }

  @cache
  get backButton() {
    return this.shadowRoot!.getElementById("back") as HTMLButtonElement;
  }

  @cache
  get gamepadStatus() {
    return this.shadowRoot!.getElementById("gamepad-status")!;
  }

  @cache
  get settingsPanel() {
    return this.shadowRoot!.querySelector("game-settings-panel") as GameSettingsPanel;
  }

  #loadingInitialWorld = false;
  #loadInitialWorld: (() => Promise<void>) | null = null;

  #input: MenuInput | null = null;
  #actions: MenuActions | null = null;
  #pauseSubscription: Subscription | null = null;

  @cache
  get #error() {
    return this.shadowRoot!.getElementById("error")!;
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (!this.shadowRoot!.hasChildNodes()) {
      this.shadowRoot!.innerHTML = `<style>${styles}</style>${template}`;
    }

    this.#actions = new MenuActions(this);

    const game = this.game;
    const loadInitialWorld = this.#loadInitialWorld;

    if (game != null && loadInitialWorld != null) {
      queueMicrotask(() => {
        if (this.isConnected && this.#input == null) {
          this.mount(game, loadInitialWorld);
        }
      });
    }
  }

  disconnectedCallback() {
    this.#pauseSubscription?.dispose();
    this.#pauseSubscription = null;
    this.#input?.destroy();
    this.#input = null;
    this.#actions?.destroy();
    this.#actions = null;
  }

  mount(game: Game<ProjectSettings>, loadInitialWorld: () => Promise<void>) {
    this.#pauseSubscription?.dispose();
    this.#input?.destroy();

    this.game = game;
    this.#loadInitialWorld = loadInitialWorld;
    this.settingsPanel.mount(game);
    this.#input = new MenuInput(this);
    this.#pauseSubscription = game.canvas.events.pauseChange.on(() => this.#sync());

    const wasHidden = this.hidden;
    this.#sync();

    if (!this.hidden && !wasHidden) {
      this.#input.activate();
    }
  }

  async playGame() {
    const game = this.game;

    if (game == null || this.#loadingInitialWorld) {
      return;
    }

    this.#error.textContent = "";

    if (game.hasWorld) {
      game.status.resume();
      return;
    }

    this.#loadingInitialWorld = true;
    this.#sync();

    try {
      await this.#loadInitialWorld?.();
      game.status.resume();

    } catch (err) {
      this.#error.textContent = "Не удалось загрузить игру. Попробуйте ещё раз.";
      console.error(err);

    } finally {
      this.#loadingInitialWorld = false;
      this.#sync();
    }
  }

  openSettings() {
    this.menuScreen.hidden = true;
    this.settingsScreen.hidden = false;
    this.settingsPanel.sync();
    this.backButton.focus();
  }

  closeSettings() {
    this.settingsPanel.cancelBindingCapture();
    this.settingsScreen.hidden = true;
    this.menuScreen.hidden = false;
    this.settingsButton.focus();
  }

  #sync() {
    const game = this.game;

    if (game == null) {
      return;
    }

    const visible = game.status.paused;
    const wasHidden = this.hidden;

    this.hidden = !visible;

    this.startButton.textContent = game.hasWorld ? "Продолжить" : "Начать игру";
    this.startButton.disabled = this.#loadingInitialWorld;

    if (visible && wasHidden) {
      this.startButton.focus();
      this.#input?.activate();

    } else if (!visible && !wasHidden) {
      this.#input?.deactivate();
    }
  }
}

customElements.define("game-menu", GameMenu);
