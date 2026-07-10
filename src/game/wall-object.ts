import { StaticObject } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

const bricks = await loadAnimation(import("#/sprites/bricks.webp"), {
  animation: import("#/sprites/bricks.animation.json")
});

export class WallObject extends StaticObject {
  static override readonly animations = { bricks };
  override readonly animations = WallObject.animations;

  init() {}
}
