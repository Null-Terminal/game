import { loadAnimation } from "#engine/animation";

export const moundTireB = await loadAnimation(import("#/sprites/terrain/mound-tire-b.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/terrain/mound-tire-b.animation.json")
});
