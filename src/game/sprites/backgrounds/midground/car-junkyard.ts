import { loadAnimation } from "#engine/animation";

export const carJunkyard = await loadAnimation(import("#game/sprites/backgrounds/midground/car-junkyard.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/car-junkyard.animation.json")
});
