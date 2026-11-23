import { loadAnimation } from "#engine/animation";

export const moundTireA = await loadAnimation(import("#game/sprites/terrain/mound-tire-a.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/terrain/mound-tire-a.animation.json")
});
