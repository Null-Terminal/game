import { loadAnimation } from "#engine/animation";

export const barrel = await loadAnimation(import("#/sprites/platforms/barrel.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/platforms/barrel.animation.json")
});
