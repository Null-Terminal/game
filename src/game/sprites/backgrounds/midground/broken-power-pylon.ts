import { loadAnimation } from "#engine/animation";

export const brokenPowerPylon = await loadAnimation(import("#game/sprites/backgrounds/midground/broken-power-pylon.webp"), {
  animation: import("#game/sprites/backgrounds/midground/broken-power-pylon.animation.json")
});
