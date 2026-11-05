import { loadAnimation } from "#engine/animation";

export const repeatableBrickWall = await loadAnimation(import("#/sprites/backgrounds/midground/repeatable-brick-wall.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/repeatable-brick-wall.animation.json")
});
