import { loadAnimation } from "#engine/animation";

export const distantCity = await loadAnimation(import("#/sprites/backgrounds/skyline/distant-city.webp"), {
  animation: import("#/sprites/backgrounds/skyline/distant-city.animation.json")
});
