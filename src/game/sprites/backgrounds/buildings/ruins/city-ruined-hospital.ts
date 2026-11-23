import { loadAnimation } from "#engine/animation";

export const cityRuinedHospital = await loadAnimation(import("#/sprites/backgrounds/buildings/ruins/city-ruined-hospital.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/buildings/ruins/city-ruined-hospital.animation.json")
});
