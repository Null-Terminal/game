import { loadAnimation } from "#engine/animation";

export const cityTowerA = await loadAnimation(import("#game/sprites/backgrounds/buildings/towers/city-tower-a.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/buildings/towers/city-tower-a.animation.json")
});
