import { loadAnimation } from "#engine/animation";

export const medkit = await loadAnimation(import("#game/sprites/interactables/medkit.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/interactables/medkit.animation.json")
});
