import { loadAnimation } from "#engine/animation";

export const curbCan = await loadAnimation(import("#game/sprites/terrain/curb-can.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/terrain/curb-can.animation.json")
});
