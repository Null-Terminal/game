import { isPositive } from "#/utils/validators";

import type { Subscription } from "#/event-emitter";
import type { Game } from "#engine/game";
import type { GameObject } from "#engine/game-objects";

export class GameSleep {
  static readonly #defaultWakeDistanceFactor = 0.8;
  static readonly #defaultCheckInterval = 250;

  readonly #game: Game;
  readonly #wakeDistanceFactor: number;
  readonly #checkInterval: number;

  #subscription: Subscription | null = null;
  readonly #settingsSubscription: Subscription;

  #lastCheckAt: number | null = null;

  constructor(game: Game) {
    this.#game = game;

    const {
      wakeDistanceFactor = GameSleep.#defaultWakeDistanceFactor,
      checkInterval = GameSleep.#defaultCheckInterval
    } = game.options.sleep ?? {};

    if (!isPositive(wakeDistanceFactor) || wakeDistanceFactor >= 1 || !isPositive(checkInterval)) {
      throw new RangeError(`${this.constructor.name}: expected a wake factor between 0 and 1 and a positive interval`);
    }

    this.#wakeDistanceFactor = wakeDistanceFactor;
    this.#checkInterval = checkInterval;

    this.#settingsSubscription = game.settings.emitter.on(game.settings.events.change, (key) => {
      if (key === "sleep") {
        this.#syncSubscription();
      }
    });

    this.#syncSubscription();
  }

  #syncSubscription() {
    this.#lastCheckAt = null;

    if (this.#game.settings.get("sleep") == null) {
      this.#subscription?.dispose();
      this.#subscription = null;

      if (this.#game.hasWorld) {
        for (const store of Object.values(this.#game.world.objects.objects)) {
          for (let index = 0; index < store.length; index++) {
            store.buffer[index]?.status.wake();
          }
        }
      }

      return;
    }

    if (this.#subscription != null) {
      return;
    }

    this.#subscription = this.#game.canvas.emitter.on(this.#game.canvas.events.beforeRender, ({ now }) => {
      const opts = this.#game.settings.get("sleep");

      if (opts == null) {
        return;
      }

      if (this.#lastCheckAt != null && now - this.#lastCheckAt < this.#checkInterval) {
        return;
      }

      this.#lastCheckAt = now;
      this.update();
    });
  }

  sleepIfFar(go: GameObject) {
    const opts = this.#game.settings.get("sleep");

    if (opts == null || go === this.#game.camera.target || !go.sleepable || go.options.sleep === false) {
      return;
    }

    if (go.isFarFromViewport(opts.distanceScreens)) {
      go.status.sleep();
    }
  }

  update() {
    const game = this.#game;
    const opts = game.settings.get("sleep");

    if (!game.hasWorld || opts == null) {
      return;
    }

    const { camera, world } = game;

    for (const kind in world.objects.objects) {
      const store = world.objects.objects[kind]!;

      for (let index = 0; index < store.length; index++) {
        const go = store.buffer[index]!;

        if (go === camera.target) {
          go.status.wake();
          continue;
        }

        if (!go.sleepable || go.options.sleep === false) {
          continue;
        }

        if (go.status.sleeping) {
          if (!go.isFarFromViewport(opts.distanceScreens * this.#wakeDistanceFactor)) {
            go.status.wake();
          }

        } else if (go.isFarFromViewport(opts.distanceScreens)) {
          go.status.sleep();
        }
      }
    }
  }

  destroy() {
    this.#settingsSubscription.dispose();
    this.#subscription?.dispose();
  }
}
