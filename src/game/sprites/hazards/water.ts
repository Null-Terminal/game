import { loadAnimation } from "#engine/animation";

export const water = await loadAnimation(import("#/sprites/hazards/water.webp"), {
  animation: import("#/sprites/hazards/water.animation.json")
});
