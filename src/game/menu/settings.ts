import { SettingsActions } from "#game/menu/settings/actions";
import { audioChannels } from "#game/menu/settings/audio-channels";
import { BindingActions } from "#game/menu/settings/bindings";
import { defaultDistanceScreens } from "#game/settings/defaults";

import styles from "#game/menu/settings/styles.css?raw";
import template from "#game/menu/settings/template.html?raw";

import type { Subscription } from "#lib/event-emitter";
import type { Game } from "#engine/game";
import type { ProjectSettings } from "#game/settings";

export class GameSettingsPanel extends HTMLElement {
  get game() {
    return this.#game;
  }

  get lastSleepDistance() {
    return this.#lastSleepDistance;
  }

  get lastArenaUnloadDistance() {
    return this.#lastArenaUnloadDistance;
  }

  #game: Game<ProjectSettings> | null = null;
  #settingsSubscription: Subscription | null = null;

  #settingsActions: SettingsActions | null = null;
  #bindingActions: BindingActions | null = null;

  #lastSleepDistance: number = defaultDistanceScreens.sleep;
  #lastArenaUnloadDistance: number = defaultDistanceScreens.arenaUnload;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `<style>${styles}</style>${template}`;
    this.#settingsActions = new SettingsActions(this);
    this.#bindingActions = new BindingActions(this);
    this.#subscribeToSettings();
  }

  disconnectedCallback() {
    this.#settingsSubscription?.dispose();
    this.#settingsSubscription = null;
    this.#settingsActions?.destroy();
    this.#settingsActions = null;
    this.#bindingActions?.destroy();
    this.#bindingActions = null;
  }

  mount(game: Game<ProjectSettings>) {
    this.#game = game;

    if (this.isConnected) {
      this.#subscribeToSettings();
    }
  }

  sync(changedKey?: PropertyKey) {
    const settings = this.#game?.settings;

    if (settings == null) {
      return;
    }

    const audio = settings.get("audio");

    for (const channel of audioChannels) {
      this.#getInput(channel).value = String(audio[channel]);
      this.#getOutput(`${channel}-value`).textContent = `${Math.round(audio[channel] * 100)}%`;
    }

    this.#getInput("dynamic-effects").checked = settings.get("dynamicEffects");

    const vibrationInput = this.#getInput("vibration-intensity");
    const vibrationIntensity = vibrationInput.disabled ? 0 : settings.get("vibrationIntensity");

    vibrationInput.value = String(vibrationIntensity);
    this.#getOutput("vibration-intensity-value").textContent = `${Math.round(vibrationIntensity * 100)}%`;

    const sleep = settings.get("sleep");

    if (sleep != null) {
      this.#lastSleepDistance = sleep.distanceScreens;
    }

    this.#getInput("sleep").checked = sleep != null;
    this.#getInput("sleep-distance").disabled = sleep == null;
    this.#getInput("sleep-distance").value = String(this.#lastSleepDistance);

    const unload = settings.get("arenaUnload");

    if (unload != null) {
      this.#lastArenaUnloadDistance = unload.distanceScreens;
    }

    this.#getInput("arena-unload").checked = unload != null;
    this.#getInput("arena-distance").disabled = unload == null;
    this.#getInput("arena-distance").value = String(this.#lastArenaUnloadDistance);

    if (changedKey == null || changedKey === "controls") {
      this.#bindingActions?.sync();
    }
  }

  cancelBindingCapture() {
    this.#bindingActions?.cancelCapture();
  }

  pollGamepadBindingCapture(): boolean {
    return this.#bindingActions?.pollGamepadCapture() ?? false;
  }

  setVibrationAvailable(available: boolean) {
    const input = this.#getInput("vibration-intensity");

    if (input.disabled !== !available) {
      input.disabled = !available;
      this.sync("vibrationIntensity");
    }
  }

  #subscribeToSettings() {
    const game = this.#game;

    if (game == null) {
      return;
    }

    this.#settingsSubscription?.dispose();
    this.#settingsSubscription = game.settings.events.change.on((key) => this.sync(key));

    this.sync();
  }

  #getInput(id: string): HTMLInputElement {
    return this.shadowRoot!.getElementById(id) as HTMLInputElement;
  }

  #getOutput(id: string): HTMLOutputElement {
    return this.shadowRoot!.getElementById(id) as HTMLOutputElement;
  }
}

customElements.define("game-settings-panel", GameSettingsPanel);
