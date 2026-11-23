import { loadAnimation } from "#engine/animation";

export const curbBottle = await loadAnimation(import("#game/sprites/terrain/curb-bottle.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/terrain/curb-bottle.animation.json")
});
