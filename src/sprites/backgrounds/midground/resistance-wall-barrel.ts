import { loadAnimation } from "#engine/animation";

export const resistanceWallBarrel = await loadAnimation(import("#/sprites/backgrounds/midground/resistance-wall-barrel.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/resistance-wall-barrel.animation.json")
});
