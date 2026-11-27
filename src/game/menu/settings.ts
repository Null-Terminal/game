import { SettingsActions } from "#game/menu/settings/actions";
import { GamepadInput } from "#engine/input";
import { audioChannels } from "#game/menu/settings/audio-channels";
import { BindingActions } from "#game/menu/settings/bindings";
import { MenuBindingActions } from "#game/menu/settings/menu-bindings";
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
  #menuBindingActions: MenuBindingActions | null = null;

  #lastSleepDistance: number = defaultDistanceScreens.sleep;
  #lastArenaUnloadDistance: number = defaultDistanceScreens.arenaUnload;

  #selectedGamepadId: string | null = null;
  #gamepadDevicesSignature = "";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `<style>${styles}</style>${template}`;
    this.#gamepadDevicesSignature = "";
    this.#settingsActions = new SettingsActions(this);
    this.#bindingActions = new BindingActions(this);
    this.#menuBindingActions = new MenuBindingActions(this);
    this.#subscribeToSettings();
    this.syncGamepadDevices();
  }

  disconnectedCallback() {
    this.#settingsSubscription?.dispose();
    this.#settingsSubscription = null;
    this.#settingsActions?.destroy();
    this.#settingsActions = null;
    this.#bindingActions?.destroy();
    this.#bindingActions = null;
    this.#menuBindingActions?.destroy();
    this.#menuBindingActions = null;
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
    this.#getSelect("gamepad-layout").value = settings.get("gamepadLayout");

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

    if (changedKey == null || changedKey === "gamepadLayout" || changedKey === "menuGamepadProfiles") {
      this.#menuBindingActions?.sync();
    }
  }

  cancelBindingCapture() {
    this.#bindingActions?.cancelCapture();
    this.#menuBindingActions?.cancelCapture();
  }

  pollGamepadBindingCapture(): boolean {
    return this.#menuBindingActions?.pollGamepadCapture() || this.#bindingActions?.pollGamepadCapture() || false;
  }

  setVibrationAvailable(available: boolean) {
    const input = this.#getInput("vibration-intensity");

    if (input.disabled !== !available) {
      input.disabled = !available;
      this.sync("vibrationIntensity");
    }
  }

  syncGamepadDevices() {
    const select = this.#getSelect("gamepad-device");
    const devices = GamepadInput.getConnectedGamepads();

    const signature = JSON.stringify(devices);
    const unavailable = devices.length === 0;

    const section = this.shadowRoot!.getElementById("gamepad-settings")!;

    if (section.hidden !== unavailable) {
      section.hidden = unavailable;
    }

    if (signature !== this.#gamepadDevicesSignature) {
      this.#gamepadDevicesSignature = signature;
      select.replaceChildren();

      if (unavailable) {
        select.add(new Option("Геймпад не обнаружен", ""));

      } else {
        for (const { index, id } of devices) {
          select.add(new Option(`${index + 1}. ${id || "Геймпад"}`, String(index)));
        }
      }
    }

    if (select.disabled !== unavailable) {
      select.disabled = unavailable;
    }

    const selectedIndex = GamepadInput.selectedIndex;
    const value = selectedIndex == null ? "" : String(selectedIndex);

    if (select.value !== value) {
      select.value = value;
    }

    const selectedGamepadId = GamepadInput.getGamepad()?.id ?? null;

    if (selectedGamepadId !== this.#selectedGamepadId) {
      this.#selectedGamepadId = selectedGamepadId;
      this.cancelBindingCapture();
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

  #getSelect(id: string): HTMLSelectElement {
    return this.shadowRoot!.getElementById(id) as HTMLSelectElement;
  }
}

customElements.define("game-settings-panel", GameSettingsPanel);
