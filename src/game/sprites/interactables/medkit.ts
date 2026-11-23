import { loadAnimation } from "#engine/animation";

export const medkit = await loadAnimation(import("#/sprites/interactables/medkit.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/interactables/medkit.animation.json")
});
