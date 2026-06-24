import { BackgroundObject } from "#engine/game-object";

import { loadAnimation } from "#engine/animation-loader";

const asphalt = await loadAnimation(import("#/sprites/asphalt.webp"), {
  animation: import("#/sprites/asphalt.animation.json")
});

export class FloorObject extends BackgroundObject {
  static override animations = { asphalt };
  declare readonly Animations: (typeof FloorObject)["animations"];

  override readonly stretchWidth: boolean = true;

  init() {
    this.play(this.animations.asphalt);
  }
}
