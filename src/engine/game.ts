import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import { Disposable } from "#engine/disposable";
import { GameStatus } from "#engine/game/game-status";
import { GameSleep } from "#engine/game/sleep";

import type { Camera } from "#engine/game/camera";
import type { RenderCanvas } from "#engine/game/render-canvas";
import type { World } from "#engine/game/world";
import type { GameOptions } from "#engine/game/sleep/types";

export type * from "#engine/game/sleep/types";

export { Camera } from "#engine/game/camera";
export type * from "#engine/game/camera";

export { World } from "#engine/game/world";
export type * from "#engine/game/world";

export { RenderCanvas } from "#engine/game/render-canvas";
export type * from "#engine/game/render-canvas";

export class Game extends Disposable {
  static camera(camera: Camera) {
    return {
      create: (canvas: RenderCanvas, options: GameOptions = {}) => new Game(canvas, camera, options)
    };
  }

  readonly camera: Camera;
  readonly canvas: RenderCanvas;
  readonly status = new GameStatus(this);
  readonly sleep: GameSleep;

  readonly emitter = new EventEmitter({
    levelLoading: handler<null>(),
    levelLoaded: handler<World>(),
    levelLoadFailed: handler<unknown>()
  });

  @cache
  get events() {
    return this.emitter.events;
  }

  get hasWorld() {
    return this.#world != null;
  }

  get world(): World {
    if (this.#world == null) {
      throw new Error("Game.world: no level is loaded");
    }

    return this.#world;
  }

  #world: World | null = null;
  #levelLoader: (() => Promise<World>) | null = null;

  protected constructor(canvas: RenderCanvas, camera: Camera, options: GameOptions) {
    super();

    this.camera = camera;
    this.canvas = canvas;

    camera.mount(this);
    this.sleep = new GameSleep(this, options.sleep);

    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        e.preventDefault();
        this.status.togglePause();
      }
    }, { signal: this.abortSignal });
  }

  override destroy() {
    super.destroy();
    this.sleep.destroy();
    this.#levelLoader = null;
    this.#world?.destroy();
    this.#world = null;
    this.camera.destroy();
    this.canvas.destroy();
    this.emitter.off();
  }

  onLevelLoad(loading: () => void, loaded: (world: World) => void, error?: (error: unknown) => void) {
    const { emitter, events } = this;

    const offLoading = emitter.on(events.levelLoading, loading);
    const offLoaded = emitter.on(events.levelLoaded, loaded);
    const offError = error == null ? null : emitter.on(events.levelLoadFailed, error);

    return () => {
      offLoading();
      offLoaded();
      offError?.();
    };
  }

  loadLevel(load: () => Promise<World>): Promise<World> {
    return this.status.runLevelLoad(async () => {
      const nextWorld = await load();

      if (this.destroyed) {
        nextWorld.destroy();
        throw new Error("Game.loadLevel: game was destroyed during loading");
      }

      if (nextWorld === this.#world) {
        throw new Error("Game.loadLevel: level is already active");
      }

      try {
        nextWorld.mount(this);

      } catch (err) {
        nextWorld.destroy();
        throw err;
      }

      const previousWorld = this.#world;
      previousWorld?.destroy();

      this.#world = nextWorld;
      this.#levelLoader = load;

      this.camera.x = 0;
      this.camera.y = 0;

      return nextWorld;
    });
  }

  reloadLevel(): Promise<World> {
    if (this.#levelLoader == null) {
      throw new Error("Game.reloadLevel: no level loader is available");
    }

    return this.loadLevel(this.#levelLoader);
  }
}
