import { loadAnimation } from "#engine/animation";

export const sidewalk = await loadAnimation(import("#game/sprites/terrain/sidewalk.webp"), {
  animation: import("#game/sprites/terrain/sidewalk.animation.json")
});
