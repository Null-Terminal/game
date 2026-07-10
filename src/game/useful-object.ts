import { InteractObject } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

import type { PersonObject } from "#game/person-object";

const [fuel] = await Promise.all([
  await loadAnimation(import("#/sprites/fuel.jpg"), {
    sprite: { removeBackground: true, tolerance: 10 },
    animation: import("#/sprites/fuel.animation.json"),
  }),
]);

export class UsefulObject extends InteractObject {
  static override readonly animations = { fuel };
  override readonly animations = UsefulObject.animations;

  apply({ stats }: PersonObject) {
    switch (this.nowPlaying) {
      case this.animations.fuel:
        if (stats.fuel < 100) {
          stats.fuel = Math.min(100, stats.fuel + 20);
          return this.destroy();
        }
    }
  }
}
