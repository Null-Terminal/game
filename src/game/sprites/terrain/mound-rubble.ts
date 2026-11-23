import { loadAnimation } from "#engine/animation";

export const moundRubble = await loadAnimation(import("#/sprites/terrain/mound-rubble.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/terrain/mound-rubble.animation.json")
});
