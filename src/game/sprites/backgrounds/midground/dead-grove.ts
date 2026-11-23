import { loadAnimation } from "#engine/animation";

export const deadGrove = await loadAnimation(import("#game/sprites/backgrounds/midground/dead-grove.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/dead-grove.animation.json")
});
