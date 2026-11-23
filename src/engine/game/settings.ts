import { EventEmitter, handler } from "#/event-emitter";
import { cast } from "#/tstools";
import { isInRange, isPositive } from "#/utils/validators";

import type { BaseGameSettings, SettingsValues } from "#engine/game/settings/types";
import type { GameStorage } from "#engine/storage";

export type * from "#engine/game/settings/types";

const baseDefaults: BaseGameSettings = {
  audio: { master: 1, effects: 1, music: 1 },
  sleep: null,
  arenaUnload: null
};

export class GameSettings<T extends object = object> {
  static async load<T extends object>(defaults: T, storage: GameStorage): Promise<GameSettings<T>> {
    const settings = new GameSettings(defaults, storage);

    try {
      const saved = await storage.get("settings", "game");
      const current = cast<Record<string, unknown>>(settings.#values);

      settings.#values = settings.#mergeValues(current, saved) as SettingsValues<T>;
      settings.#validateSettings(settings.#values);

    } catch (err) {
      console.warn("Could not load game settings", err);
      settings.#values = structuredClone({ ...baseDefaults, ...defaults });
    }

    return settings;
  }

  #values: SettingsValues<T>;
  readonly #storage: GameStorage | null;
  #saving: Promise<void> = Promise.resolve();

  readonly emitter = new EventEmitter({
    change: handler<PropertyKey>()
  });

  readonly events = this.emitter.events;

  constructor(defaults: T, storage: GameStorage | null = null) {
    this.#values = structuredClone({ ...baseDefaults, ...defaults });
    this.#validateSettings(this.#values);
    this.#storage = storage;
  }

  get<K extends keyof SettingsValues<T>>(key: K): Readonly<SettingsValues<T>[K]> {
    return this.#values[key];
  }

  set<K extends keyof SettingsValues<T>>(key: K, value: SettingsValues<T>[K]) {
    const next = structuredClone({ ...this.#values, [key]: value });

    this.#validateSettings(next);
    this.#values = next;

    if (this.#storage != null) {
      const snapshot = structuredClone(next);
      this.#saving = this.#saving.then(() => this.#storage!.put("settings", "game", snapshot)).catch((error) => {
        console.warn("Could not save game settings", error);
      });
    }

    this.events.change.emit(key);
  }

  #validateSettings(settings: BaseGameSettings) {
    for (const volume of Object.values(settings.audio)) {
      if (!isInRange(volume, 0, 1)) {
        throw new RangeError("Audio volume must be between 0 and 1");
      }
    }

    const sleep = settings.sleep;

    if (sleep != null && !isPositive(sleep.distanceScreens)) {
      throw new RangeError("Sleep distance must be positive");
    }

    const arenaUnload = settings.arenaUnload;

    if (arenaUnload != null && !isPositive(arenaUnload.distanceScreens)) {
      throw new RangeError("Arena unload distance must be positive");
    }
  }

  #mergeValues(defaults: Record<string, unknown>, stored: unknown): Record<string, unknown> {
    if (typeof stored !== "object" || stored == null || Array.isArray(stored)) {
      return defaults;
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(defaults)) {
      const saved = (stored as Record<string, unknown>)[key];

      if ((key === "sleep" || key === "arenaUnload") && saved === null) {
        result[key] = null;

      } else if (
        (key === "sleep" || key === "arenaUnload") &&
        saved != null && typeof saved === "object" && !Array.isArray(saved)
      ) {
        result[key] = { distanceScreens: (saved as Record<string, unknown>)["distanceScreens"] };

      } else if (typeof value === "object" && value != null && !Array.isArray(value)) {
        result[key] = this.#mergeValues(value as Record<string, unknown>, saved);

      } else if (typeof saved === typeof value && (typeof saved !== "number" || Number.isFinite(saved))) {
        result[key] = saved;

      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
