import { isPositive } from "#/utils/validators";

import type { Subscription } from "#/event-emitter";
import type { Game } from "#engine/game";
import type { GameObject } from "#engine/game-objects";
import type { GameSleepOptions } from "#engine/game/sleep/types";

export class GameSleep {
  readonly #game: Game;
  readonly #options: Required<GameSleepOptions> | null;
  readonly #subscription: Subscription | null;

  #elapsed = 0;

  constructor(game: Game, opts?: GameSleepOptions) {
    this.#game = game;

    if (opts == null) {
      this.#options = null;
      this.#subscription = null;
      return;
    }

    const {
      distanceScreens,
      wakeDistanceScreens = distanceScreens * 0.8,
      checkIntervalSeconds = 0.25
    } = opts;

    if (
      !isPositive(distanceScreens) ||
      !isPositive(wakeDistanceScreens) ||
      wakeDistanceScreens >= distanceScreens ||
      !isPositive(checkIntervalSeconds)
    ) {
      throw new RangeError(`${this.constructor.name}: expected positive distances, wake distance below sleep distance, and a positive interval`);
    }

    this.#options = { distanceScreens, wakeDistanceScreens, checkIntervalSeconds };
    this.#elapsed = checkIntervalSeconds;

    this.#subscription = game.canvas.emitter.on(game.canvas.events.beforeRender, ({ delta }) => {
      this.#elapsed += delta;

      if (this.#elapsed >= checkIntervalSeconds) {
        this.#elapsed = 0;
        this.update();
      }
    });
  }

  prepare(go: GameObject) {
    const options = this.#options;

    if (options == null || go === this.#game.camera.target || !go.sleepable || go.options.sleep === false) {
      return;
    }

    if (go.isFarFromViewport(options.distanceScreens)) {
      go.status.sleep();
    }
  }

  update() {
    const opts = this.#options;
    const game = this.#game;

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
          if (!go.isFarFromViewport(opts.wakeDistanceScreens)) {
            go.status.wake();
          }

        } else if (go.isFarFromViewport(opts.distanceScreens)) {
          go.status.sleep();
        }
      }
    }
  }

  destroy() {
    this.#subscription?.dispose();
  }
}
