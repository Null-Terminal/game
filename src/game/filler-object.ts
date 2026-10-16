import { BackgroundObject } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

const [night, asphalt, meshFence, water, lava] = await Promise.all([
  loadAnimation(import("#/sprites/night.webp"), {
    animation: import("#/sprites/night.animation.json")
  }),

  loadAnimation(import("#/sprites/asphalt.webp"), {
    animation: import("#/sprites/asphalt.animation.json")
  }),

  loadAnimation(import("#/sprites/mesh-fence.webp"), {
    sprite: { removeBackground: true, tolerance: 30 },
    animation: import("#/sprites/mesh-fence.animation.json")
  }),

  loadAnimation(import("#/sprites/water.webp"), {
    sprite: { removeBackground: true, tolerance: 30 },
    animation: import("#/sprites/water.animation.json")
  }),

  loadAnimation(import("#/sprites/lava.webp"), {
    sprite: { removeBackground: true, tolerance: 30 },
    animation: import("#/sprites/lava.animation.json")
  })
]);

export class FillerObject extends BackgroundObject {
  static override readonly animations = { night, asphalt, meshFence, water, lava };
  override readonly animations = FillerObject.animations;

  init() {}
}
