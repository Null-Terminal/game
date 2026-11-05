import { loadAnimation } from "#engine/animation";

export const elevatorShaft = await loadAnimation(import("#/sprites/platforms/elevator/shaft.webp"), {
  animation: import("#/sprites/platforms/elevator/shaft.animation.json")
});
