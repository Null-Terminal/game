import { loadAnimation } from "#engine/animation";

export const barrel = await loadAnimation(import("#game/sprites/platforms/barrel.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/platforms/barrel.animation.json")
});
