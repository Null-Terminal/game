import { DynamicObject, GameObject } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

import { UsefulObject } from "#game/useful-object";

const wall = await loadAnimation(import("#/sprites/bricks.webp"), {
  animation: import("#/sprites/bricks.animation.json")
});

export class PlatformObject extends DynamicObject {
  static override readonly animations = { wall };
  override readonly animations = PlatformObject.animations;

  init() {
    this.play(this.animations.wall);
  }

  override visit(go: GameObject) {
    if (go instanceof UsefulObject && go.nowPlaying === go.animations.trigger) {
      this.togglePause();
    }
  }
}
