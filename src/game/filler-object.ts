import { BackgroundObject } from "#engine/game-object";

import { loadAnimation } from "#engine/animation-loader";

const [night, asphalt, meshFence] = await Promise.all([
  await loadAnimation(import("#/sprites/night.webp"), {
    animation: import("#/sprites/night.animation.json")
  }),

  loadAnimation(import("#/sprites/asphalt.webp"), {
    animation: import("#/sprites/asphalt.animation.json")
  }),

  loadAnimation(import("#/sprites/mesh-fence.webp"), {
    sprite: { removeBackground: true, tolerance: 30 },
    animation: import("#/sprites/mesh-fence.animation.json")
  })
]);

export class FillerObject extends BackgroundObject {
  static override animations = { night, asphalt, meshFence };
  declare readonly Animations: (typeof FillerObject)["animations"];

  init() {
    // Ничего не делаю
  }
}
