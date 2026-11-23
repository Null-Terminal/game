import { loadAnimation } from "#engine/animation";

export const cityWatchtower = await loadAnimation(import("#game/sprites/backgrounds/buildings/towers/city-watchtower.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/buildings/towers/city-watchtower.animation.json")
});
