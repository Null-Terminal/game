import { loadAnimation } from "#engine/animation";

export const water = await loadAnimation(import("#game/sprites/hazards/water.webp"), {
  animation: import("#game/sprites/hazards/water.animation.json")
});
