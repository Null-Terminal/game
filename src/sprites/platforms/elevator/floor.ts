import { loadAnimation } from "#engine/animation";

export const elevatorFloor = await loadAnimation(import("#/sprites/platforms/elevator/floor.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/platforms/elevator/floor.animation.json")
});
