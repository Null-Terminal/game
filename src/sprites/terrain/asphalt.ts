import { loadAnimation } from "#engine/animation";

export const asphalt = await loadAnimation(import("#/sprites/terrain/asphalt.webp"), {
  animation: import("#/sprites/terrain/asphalt.animation.json")
});
