import { loadAnimation } from "#engine/animation";

export const scaffoldFrame = await loadAnimation(import("#game/sprites/platforms/scaffold-frame.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/platforms/scaffold-frame.animation.json")
});
