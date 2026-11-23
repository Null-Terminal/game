import { loadAnimation } from "#engine/animation";

export const scaffoldFrame = await loadAnimation(import("#/sprites/platforms/scaffold-frame.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/platforms/scaffold-frame.animation.json")
});
