import { loadAnimation } from "#engine/animation";

export const abandonedGarages = await loadAnimation(import("#/sprites/backgrounds/midground/abandoned-garages.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/abandoned-garages.animation.json")
});
