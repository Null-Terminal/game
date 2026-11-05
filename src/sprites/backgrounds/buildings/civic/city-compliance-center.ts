import { loadAnimation } from "#engine/animation";

export const cityComplianceCenter = await loadAnimation(import("#/sprites/backgrounds/buildings/civic/city-compliance-center.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/buildings/civic/city-compliance-center.animation.json")
});
