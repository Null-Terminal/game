import { StaticalObject } from "#engine/game-object";

import { loadAnimation } from "#engine/animation-loader";

const wall = await loadAnimation(import("#/sprites/wall.png"), {
  animation: import("#/sprites/wall.animation.json")
});

export class WallObject extends StaticalObject {
  static override animations = { wall };
  declare readonly Animations: (typeof WallObject)["animations"];

  init() {
    this.play(this.animations.wall);
  }
}
