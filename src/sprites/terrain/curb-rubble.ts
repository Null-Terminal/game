import { loadAnimation } from "#engine/animation";

export const curbRubble = await loadAnimation(import("#/sprites/terrain/curb-rubble.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/terrain/curb-rubble.animation.json")
});
