import { loadAnimation } from "#engine/animation";

export const breachedPerimeterWall = await loadAnimation(import("#/sprites/backgrounds/midground/breached-perimeter-wall.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/breached-perimeter-wall.animation.json")
});
