import { BackgroundObject } from "#engine/game-object";

import { loadAnimation } from "#engine/animation-loader";

const skybox = await loadAnimation(import("#/sprites/night.webp"), {
  animation: import("#/sprites/night.animation.json")
});

export class SkyboxObject extends BackgroundObject {
  static override animations = { skybox };
  declare readonly Animations: (typeof SkyboxObject)["animations"];

  override readonly stretchWidth: boolean = true;

  init() {
    this.play(this.animations.skybox);
  }
}
