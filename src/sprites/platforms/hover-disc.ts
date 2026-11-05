import { loadAnimation } from "#engine/animation";

export const hoverDisc = await loadAnimation(import("#/sprites/platforms/hover-disc.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/platforms/hover-disc.animation.json")
});
