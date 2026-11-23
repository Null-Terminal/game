import { loadAnimation } from "#engine/animation";

const spriteOptions = { removeBackground: true, tolerance: 30 };

const [rear, front, ceiling] = await Promise.all([
  loadAnimation(import("#game/sprites/platforms/elevator/rear.webp"), {
    sprite: spriteOptions,
    animation: import("#game/sprites/platforms/elevator/rear.animation.json")
  }),

  loadAnimation(import("#game/sprites/platforms/elevator/front.webp"), {
    sprite: spriteOptions,
    animation: import("#game/sprites/platforms/elevator/front.animation.json")
  }),

  loadAnimation(import("#game/sprites/platforms/elevator/ceiling.webp"), {
    sprite: spriteOptions,
    animation: import("#game/sprites/platforms/elevator/ceiling.animation.json")
  })
]);

export const cabinSprites = { rear, front, ceiling };
