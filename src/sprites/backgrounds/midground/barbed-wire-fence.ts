import { loadAnimation } from "#engine/animation";

export const barbedWireFence = await loadAnimation(import("#/sprites/backgrounds/midground/barbed-wire-fence.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/barbed-wire-fence.animation.json")
});
