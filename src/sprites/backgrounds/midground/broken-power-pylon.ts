import { loadAnimation } from "#engine/animation";

export const brokenPowerPylon = await loadAnimation(import("#/sprites/backgrounds/midground/broken-power-pylon.webp"), {
  animation: import("#/sprites/backgrounds/midground/broken-power-pylon.animation.json")
});
