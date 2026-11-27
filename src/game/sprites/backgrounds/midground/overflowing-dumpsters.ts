import { loadAnimation } from "#engine/animation";

export const overflowingDumpsters = await loadAnimation(import("#game/sprites/backgrounds/midground/overflowing-dumpsters.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/overflowing-dumpsters.animation.json")
});
