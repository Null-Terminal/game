import { loadAnimation } from "#engine/animation";

export const acid = await loadAnimation(import("#game/sprites/hazards/acid.webp"), {
  animation: import("#game/sprites/hazards/acid.animation.json")
});
