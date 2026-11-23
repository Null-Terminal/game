import { loadAnimation } from "#engine/animation";

export const cityRuinedResidence = await loadAnimation(import("#game/sprites/backgrounds/buildings/ruins/city-ruined-residence.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/buildings/ruins/city-ruined-residence.animation.json")
});
