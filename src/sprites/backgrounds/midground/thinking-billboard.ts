import { loadAnimation } from "#engine/animation";

export const thinkingBillboard = await loadAnimation(import("#/sprites/backgrounds/midground/thinking-billboard.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/thinking-billboard.animation.json")
});
