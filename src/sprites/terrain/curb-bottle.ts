import { loadAnimation } from "#engine/animation";

export const curbBottle = await loadAnimation(import("#/sprites/terrain/curb-bottle.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/terrain/curb-bottle.animation.json")
});
