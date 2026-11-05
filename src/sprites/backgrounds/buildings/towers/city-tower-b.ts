import { loadAnimation } from "#engine/animation";

export const cityTowerB = await loadAnimation(import("#/sprites/backgrounds/buildings/towers/city-tower-b.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/buildings/towers/city-tower-b.animation.json")
});
