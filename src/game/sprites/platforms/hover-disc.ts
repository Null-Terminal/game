import { loadAnimation } from "#engine/animation";

export const hoverDisc = await loadAnimation(import("#game/sprites/platforms/hover-disc.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/platforms/hover-disc.animation.json")
});
