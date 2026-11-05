import { loadAnimation } from "#engine/animation";

export const cityRuinedObservatory = await loadAnimation(import("#/sprites/backgrounds/buildings/ruins/city-ruined-observatory.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/buildings/ruins/city-ruined-observatory.animation.json")
});
