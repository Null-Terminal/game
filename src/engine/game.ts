import { cache } from "#/utils/decorators/cache";
import { EventEmitter, handler } from "#lib/event-emitter";

import { Destroyable } from "#lib/destroyable";
import { GameAudio } from "#engine/game/audio";
import { GameStatus } from "#engine/game/game-status";
import { GameSettings } from "#engine/game/settings";
import { GameSleep } from "#engine/game/sleep";

import type { Camera } from "#engine/game/camera";
import type { RenderCanvas } from "#engine/game/render-canvas";
import type { World } from "#engine/game/world";
import type { GameOptions } from "#engine/game/types";

export type * from "#engine/game/types";
export type * from "#engine/game/sleep/types";

export { GameSettings } from "#engine/game/settings";
export type * from "#engine/game/settings";

export { Camera } from "#engine/game/camera";
export type * from "#engine/game/camera";

export { World } from "#engine/game/world";
export { Arena, Arenas } from "#engine/game/arena";
export type * from "#engine/game/world";

export { RenderCanvas } from "#engine/game/render-canvas";
export type * from "#engine/game/render-canvas";

export class Game<T extends object = object> extends Destroyable {
  static camera(camera: Camera) {
    return {
      create: (canvas: RenderCanvas, opts: GameOptions = {}) => new Game(canvas, camera, new GameSettings({}), opts),
      settings: <T extends object>(settings: GameSettings<T>) => ({
        create: (canvas: RenderCanvas, opts: GameOptions = {}) => new Game<T>(canvas, camera, settings, opts)
      })
    };
  }

  readonly camera: Camera;
  readonly canvas: RenderCanvas;
  readonly settings: GameSettings<T>;
  readonly options: GameOptions;
  readonly status = new GameStatus(this);

  @cache
  get audio() {
    return this.#audio = new GameAudio(this);
  }

  #audio: GameAudio | null = null;

  @cache
  get sleep() {
    return new GameSleep(this);
  }

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
      throw new Error(`${this.constructor.name}.world: no level is loaded`);
    }

    return this.#world;
  }

  #world: World | null = null;
  #levelLoader: (() => Promise<World>) | null = null;

  protected constructor(canvas: RenderCanvas, camera: Camera, settings: GameSettings<T>, opts: GameOptions) {
    super();

    this.camera = camera;
    this.canvas = canvas;
    this.settings = settings;
    this.options = opts;
    camera.mount(this);

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
    this.#audio?.destroy();
    this.camera.destroy();
    this.canvas.destroy();
    this.emitter.off();
  }

  onLevelLoad(loading: () => void, loaded: (world: World) => void, error?: (error: unknown) => void) {
    const offLoading = this.events.levelLoading.on(loading);
    const offLoaded = this.events.levelLoaded.on(loaded);
    const offError = error == null ? null : this.events.levelLoadFailed.on(error);

    return () => {
      offLoading.dispose();
      offLoaded.dispose();
      offError?.dispose();
    };
  }

  loadLevel(load: () => Promise<World>): Promise<World> {
    return this.status.runLevelLoad(async () => {
      const nextWorld = await load();

      if (this.destroyed) {
        nextWorld.destroy();
        throw new Error(`${this.constructor.name}.loadLevel: game was destroyed during loading`);
      }

      if (nextWorld === this.#world) {
        throw new Error(`${this.constructor.name}.loadLevel: level is already active`);
      }

      const previousWorld = this.#world;
      const previousTarget = this.camera.target;

      const previousX = this.camera.x;
      const previousY = this.camera.y;

      this.camera.x = 0;
      this.camera.y = 0;

      const abort = () => nextWorld.destroy();
      this.abortSignal.addEventListener("abort", abort, { once: true });

      try {
        await nextWorld.mount(this);

        if (this.destroyed) {
          throw new Error(`${this.constructor.name}.loadLevel: game was destroyed during loading`);
        }

      } catch (err) {
        let cleanupError: unknown;

        try {
          nextWorld.destroy();

        } catch (error) {
          cleanupError = error;
        }

        if (!this.destroyed) {
          this.camera.x = previousX;
          this.camera.y = previousY;

          if (previousTarget != null) {
            this.camera.bindTo(previousTarget);
          }
        }

        if (cleanupError != null) {
          throw new AggregateError([err, cleanupError], `${this.constructor.name}.loadLevel: rollback failed`, { cause: err });
        }

        throw err;

      } finally {
        this.abortSignal.removeEventListener("abort", abort);
      }

      previousWorld?.destroy();

      this.#world = nextWorld;
      this.#levelLoader = load;

      return nextWorld;
    });
  }

  reloadLevel(): Promise<World> {
    if (this.#levelLoader == null) {
      throw new Error(`${this.constructor.name}.reloadLevel: no level loader is available`);
    }

    return this.loadLevel(this.#levelLoader);
  }
}
