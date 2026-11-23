import { loadAnimation } from "#engine/animation";

export const drainWall = await loadAnimation(import("#/sprites/backgrounds/midground/drain-wall.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/drain-wall.animation.json")
});
