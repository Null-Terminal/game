import { describe, expect, expectTypeOf, it } from "vitest";

import { Game, type Camera, type RenderCanvas } from "#engine/game";
import { GameSettings } from "#engine/game/settings";

import type { GameStorage, GameStoreName } from "#engine/storage";

function checkBuilderTypes(camera: Camera, canvas: RenderCanvas) {
  const settings = new GameSettings({ fog: true, sleep: { distanceScreens: 3 } });
  const game = Game.camera(camera).settings(settings).create(canvas);

  expectTypeOf(game.settings.get("fog")).toEqualTypeOf<boolean>();
  game.settings.set("sleep", null);
}

void checkBuilderTypes;

class MemoryStorage implements GameStorage {
  readonly values = new Map<string, unknown>();

  async get<T>(store: GameStoreName, key: IDBValidKey): Promise<T | undefined> {
    return this.values.get(`${store}:${key}`) as T | undefined;
  }

  async put(store: GameStoreName, key: IDBValidKey, value: unknown): Promise<void> {
    this.values.set(`${store}:${key}`, value);
  }

  async delete(store: GameStoreName, key: IDBValidKey): Promise<void> {
    this.values.delete(`${store}:${key}`);
  }

  async getAllKeys(store: GameStoreName): Promise<IDBValidKey[]> {
    return [...this.values.keys()]
      .filter((key) => key.startsWith(`${store}:`))
      .map((key) => key.slice(store.length + 1));
  }

  destroy() {}

  [Symbol.dispose]() {
    this.destroy();
  }
}

describe("GameSettings", () => {
  it("restores project settings and applies new defaults", async () => {
    const storage = new MemoryStorage();
    storage.values.set("settings:game", {
      audio: { effects: 0.4 },
      fog: false,
      sleep: null
    });
    storage.values.set("saves:slot-1", { level: "street" });

    const settings = await GameSettings.load({
      fog: true,
      controls: { jump: "Space" },
      sleep: { distanceScreens: 3 }
    }, storage);

    expect(settings.get("fog")).toBe(false);
    expect(settings.get("controls")).toEqual({ jump: "Space" });
    expect(settings.get("sleep")).toBeNull();
    expect(settings.get("audio")).toEqual({ master: 1, effects: 0.4, music: 1 });

    settings.set("fog", true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((await storage.get<Record<string, unknown>>("settings", "game"))?.["fog"]).toBe(true);
    expect(await storage.get("saves", "slot-1")).toEqual({ level: "street" });
  });

  it("rejects invalid volumes and sleep distances", () => {
    const settings = new GameSettings({ fog: true });

    expect(() => settings.set("audio", { master: 1.5, effects: 1, music: 1 })).toThrow(RangeError);
    expect(() => settings.set("sleep", { distanceScreens: 0 })).toThrow(RangeError);
    expect(() => settings.set("arenaUnload", { distanceScreens: -1 })).toThrow(RangeError);
    expect(settings.get("audio").master).toBe(1);
    expect(settings.get("sleep")).toBeNull();
    expect(settings.get("arenaUnload")).toBeNull();
  });

  it("drops obsolete sleep options from saved settings", async () => {
    const storage = new MemoryStorage();
    storage.values.set("settings:game", {
      sleep: { distanceScreens: 4, wakeDistanceScreens: 2, checkInterval: 100 }
    });

    const settings = await GameSettings.load({ sleep: { distanceScreens: 3 } }, storage);
    expect(settings.get("sleep")).toEqual({ distanceScreens: 4 });
  });

  it("emits changed keys through the shared emitter", () => {
    const settings = new GameSettings({ fog: true });
    const changes: PropertyKey[] = [];
    const subscription = settings.events.change.on((key) => changes.push(key));

    settings.set("fog", false);
    subscription.dispose();
    settings.set("fog", true);

    expect(changes).toEqual(["fog"]);
  });
});
