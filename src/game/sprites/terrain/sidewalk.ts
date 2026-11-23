import { loadAnimation } from "#engine/animation";

export const sidewalk = await loadAnimation(import("#/sprites/terrain/sidewalk.webp"), {
  animation: import("#/sprites/terrain/sidewalk.animation.json")
});
