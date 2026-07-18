import { InteractObject } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

import type { PersonObject } from "#game/person-object";

const [fuel, trigger] = await Promise.all([
  await loadAnimation(import("#/sprites/fuel.webp"), {
    sprite: { removeBackground: true },
    animation: import("#/sprites/fuel.animation.json"),
  }),

  await loadAnimation(import("#/sprites/trigger.webp"), {
    sprite: { removeBackground: true },
    animation: import("#/sprites/trigger.animation.json"),
  }),
]);

export class UsefulObject extends InteractObject {
  static override readonly animations = { fuel, trigger };
  override readonly animations = UsefulObject.animations;

  #used = false;

  override destroy() {
    super.destroy();
    this.#used = false;
  }

  override visit({ stats, actions }: PersonObject) {
    switch (this.nowPlaying) {
      case this.animations.fuel:
        if (stats.fuel < 100) {
          stats.fuel = Math.min(100, stats.fuel + 20);
          return this.destroy();
        }

        break;

      case this.animations.trigger:
        if (actions.use) {
          if (!this.#used) {
            this.#used = true;
            this.acceptor?.visit(this);
          }

        } else {
          this.#used = false;
        }

        break;
    }
  }
}
