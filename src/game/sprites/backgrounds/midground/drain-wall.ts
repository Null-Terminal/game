import { loadAnimation } from "#engine/animation";

export const drainWall = await loadAnimation(import("#game/sprites/backgrounds/midground/drain-wall.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/drain-wall.animation.json")
});
