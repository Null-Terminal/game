import { loadAnimation } from "#engine/animation";

export const asphalt = await loadAnimation(import("#game/sprites/terrain/asphalt.webp"), {
  animation: import("#game/sprites/terrain/asphalt.animation.json")
});
