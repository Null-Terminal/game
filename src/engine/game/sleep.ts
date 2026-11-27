import { isPositive } from "#/utils/validators";
import { Destroyable } from "#lib/destroyable";

import type { Subscription } from "#lib/event-emitter";
import type { Game, SleepSettings } from "#engine/game";
import type { GameObject } from "#engine/game-objects";
import type { GameSleepOptions } from "#engine/game/sleep/types";

export class GameSleep extends Destroyable {
  readonly #game: Game;

  readonly #options: Required<GameSleepOptions>;
  #sleepSettings: SleepSettings | null;

  #subscription: Subscription | null = null;
  readonly #settingsSubscription: Subscription;

  #lastCheckAt: number | null = null;

  constructor(game: Game) {
    super();
    this.#game = game;

    const {
      wakeDistanceFactor = 0.8,
      checkInterval = 1000
    } = game.options.sleep ?? {};

    if (!isPositive(wakeDistanceFactor) || wakeDistanceFactor >= 1 || !isPositive(checkInterval)) {
      throw new RangeError(`${this.constructor.name}: expected a wake factor between 0 and 1 and a positive interval`);
    }

    this.#options = { wakeDistanceFactor, checkInterval };
    this.#sleepSettings = game.settings.get("sleep");

    this.#settingsSubscription = game.settings.events.change.on((key) => {
      if (key === "sleep") {
        this.#sleepSettings = game.settings.get("sleep");
        this.#syncSubscription();
      }
    });

    this.#syncSubscription();

    this.onDestroy(() => {
      this.#settingsSubscription.dispose();
      this.#subscription?.dispose();
    });
  }

  #syncSubscription() {
    this.#lastCheckAt = null;

    if (this.#sleepSettings == null) {
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

    this.#subscription = this.#game.canvas.events.beforeRender.on(({ now }) => {
      if (this.#lastCheckAt != null && now - this.#lastCheckAt < this.#options.checkInterval) {
        return;
      }

      this.#lastCheckAt = now;
      this.update();
    });
  }

  sleepIfFar(go: GameObject) {
    const opts = this.#sleepSettings;

    if (opts == null || go === this.#game.camera.target || !go.sleepable || go.options.sleep === false) {
      return;
    }

    if (go.isFarFromViewport(opts.distanceScreens)) {
      go.status.sleep();
    }
  }

  update() {
    const game = this.#game;
    const opts = this.#sleepSettings;

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
          if (!go.isFarFromViewport(opts.distanceScreens * this.#options.wakeDistanceFactor)) {
            go.status.wake();
          }

        } else if (go.isFarFromViewport(opts.distanceScreens)) {
          go.status.sleep();
        }
      }
    }
  }

}
