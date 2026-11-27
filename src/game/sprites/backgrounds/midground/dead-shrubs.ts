import { loadAnimation } from "#engine/animation";

export const deadShrubs = await loadAnimation(import("#game/sprites/backgrounds/midground/dead-shrubs.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/dead-shrubs.animation.json")
});
