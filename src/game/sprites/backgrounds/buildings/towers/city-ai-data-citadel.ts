import { loadAnimation } from "#engine/animation";

export const cityAiDataCitadel = await loadAnimation(import("#/sprites/backgrounds/buildings/towers/city-ai-data-citadel.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/buildings/towers/city-ai-data-citadel.animation.json")
});
