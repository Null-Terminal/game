import { loadAnimation } from "#engine/animation";

export const cityAutomatedDepot = await loadAnimation(import("#game/sprites/backgrounds/buildings/industrial/city-automated-depot.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/buildings/industrial/city-automated-depot.animation.json")
});
