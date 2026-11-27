import { loadAnimation } from "#engine/animation";

export const distantCity = await loadAnimation(import("#game/sprites/backgrounds/skyline/distant-city.webp"), {
  animation: import("#game/sprites/backgrounds/skyline/distant-city.animation.json")
});
