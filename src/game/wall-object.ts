import { GameObject, type Animations } from "#engine/game-object";

import { loadSprite } from "#engine/sprite-loader";
import { SpriteAnimation } from "#/sprite-animation";

import wallAnimation from "#/sprites/wall.animation.json";
import wall from "#/sprites/wall.png";

const image = await loadSprite(wall);

export class WallObject extends GameObject {
  static override animations = {
    default: [image, new SpriteAnimation(wallAnimation.sprites)],
  } satisfies Animations;

  declare readonly Animations: (typeof WallObject)["animations"];

  init() {
    this.play(this.animations.default);
  }
}
