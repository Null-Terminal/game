import { loadAnimation } from "#engine/animation";

export const physicsWall = await loadAnimation(import("#/sprites/backgrounds/midground/physics-wall.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/physics-wall.animation.json")
});
