import { loadAnimation } from "#engine/animation";

export const acid = await loadAnimation(import("#/sprites/hazards/acid.webp"), {
  animation: import("#/sprites/hazards/acid.animation.json")
});
