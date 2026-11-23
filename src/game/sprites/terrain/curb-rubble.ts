import { loadAnimation } from "#engine/animation";

export const curbRubble = await loadAnimation(import("#game/sprites/terrain/curb-rubble.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/terrain/curb-rubble.animation.json")
});
