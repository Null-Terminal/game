import { loadAnimation } from "#engine/animation";

export const breachedPerimeterWall = await loadAnimation(import("#game/sprites/backgrounds/midground/breached-perimeter-wall.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/breached-perimeter-wall.animation.json")
});
