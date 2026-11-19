import { isPositive } from "#/utils/validators";

import type { Subscription } from "#/event-emitter";
import type { Game } from "#engine/game";
import type { GameObject } from "#engine/game-objects";
import type { GameSleepOptions } from "#engine/game/sleep/types";

export class GameSleep {
  readonly #game: Game;

  readonly #options: Required<GameSleepOptions> | null;
  readonly #subscription: Subscription | null;

  #lastCheckAt: number | null = null;

  constructor(game: Game) {
    this.#game = game;

    const opts = game.options.sleep;

    if (opts == null) {
      this.#options = null;
      this.#subscription = null;
      return;
    }

    const {
      distanceScreens,
      wakeDistanceScreens = distanceScreens * 0.8,
      checkInterval = 250
    } = opts;

    if (
      !isPositive(distanceScreens) ||
      !isPositive(wakeDistanceScreens) ||
      wakeDistanceScreens >= distanceScreens ||
      !isPositive(checkInterval)
    ) {
      throw new RangeError(`${this.constructor.name}: expected positive distances, wake distance below sleep distance, and a positive interval`);
    }

    this.#options = { distanceScreens, wakeDistanceScreens, checkInterval };

    this.#subscription = game.canvas.emitter.on(game.canvas.events.beforeRender, ({ now }) => {
      if (this.#lastCheckAt != null && now - this.#lastCheckAt < checkInterval) {
        return;
      }

      this.#lastCheckAt = now;
      this.update();
    });
  }

  sleepIfFar(go: GameObject) {
    const opts = this.#options;

    if (opts == null || go === this.#game.camera.target || !go.sleepable || go.options.sleep === false) {
      return;
    }

    if (go.isFarFromViewport(opts.distanceScreens)) {
      go.status.sleep();
    }
  }

  update() {
    const game = this.#game;
    const opts = this.#options;

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
