import { DomActionHandlers } from "#lib/dom-action-handlers";
import { audioChannels } from "#game/menu/settings/audio-channels";

import type { GameSettingsPanel } from "#game/menu/settings";

export class SettingsActions extends DomActionHandlers<GameSettingsPanel> {
  get #settings() {
    return this.parent.game?.settings;
  }

  constructor(panel: GameSettingsPanel) {
    super(panel);
  }

  setAudio(event: Event) {
    const input = event.target;
    const settings = this.#settings;

    if (
      event.type !== "input" ||
      !(input instanceof HTMLInputElement) ||
      !audioChannels.some((channel) => channel === input.id) ||
      settings == null
    ) {
      return;
    }

    const audio = settings.get("audio");

    settings.set("audio", { ...audio, [input.id]: input.valueAsNumber });
  }

  setDynamicEffects(event: Event) {
    const input = event.target;

    if (event.type === "change" && input instanceof HTMLInputElement) {
      this.#settings?.set("dynamicEffects", input.checked);
    }
  }

  setVibrationIntensity(event: Event) {
    const input = event.target;

    if (event.type === "input" && input instanceof HTMLInputElement && !input.disabled) {
      this.#settings?.set("vibrationIntensity", input.valueAsNumber);
    }
  }

  setSleep(event: Event) {
    const input = event.target;

    if (event.type === "change" && input instanceof HTMLInputElement) {
      this.#settings?.set("sleep", input.checked ? { distanceScreens: this.parent.lastSleepDistance } : null);
    }
  }

  setSleepDistance(event: Event) {
    const input = event.target;
    const settings = this.#settings;

    if (event.type !== "change" || !(input instanceof HTMLInputElement) || settings == null) {
      return;
    }

    if (Number.isFinite(input.valueAsNumber) && input.valueAsNumber > 0) {
      settings.set("sleep", { distanceScreens: input.valueAsNumber });

    } else {
      this.parent.sync();
    }
  }

  setArenaUnload(event: Event) {
    const input = event.target;

    if (event.type === "change" && input instanceof HTMLInputElement) {
      this.#settings?.set("arenaUnload", input.checked ? { distanceScreens: this.parent.lastArenaUnloadDistance } : null);
    }
  }

  setArenaDistance(event: Event) {
    const input = event.target;
    const settings = this.#settings;

    if (event.type !== "change" || !(input instanceof HTMLInputElement) || settings == null) {
      return;
    }

    if (Number.isFinite(input.valueAsNumber) && input.valueAsNumber > 0) {
      settings.set("arenaUnload", { distanceScreens: input.valueAsNumber });

    } else {
      this.parent.sync();
    }
  }

  protected initHandlers() {
    const root = this.parent.shadowRoot!;
    root.addEventListener("input", this.onAction, { signal: this.abortSignal });
    root.addEventListener("change", this.onAction, { signal: this.abortSignal });
  }
}
