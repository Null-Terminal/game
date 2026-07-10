import { DynamicObject } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

const wall = await loadAnimation(import("#/sprites/bricks.webp"), {
  animation: import("#/sprites/bricks.animation.json")
});

export class PlatformObject extends DynamicObject {
  static override readonly animations = { wall };
  override readonly animations = PlatformObject.animations;

  init() {
    this.play(this.animations.wall);
  }
}
