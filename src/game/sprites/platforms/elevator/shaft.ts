import { loadAnimation } from "#engine/animation";

export const elevatorShaft = await loadAnimation(import("#game/sprites/platforms/elevator/shaft.webp"), {
  animation: import("#game/sprites/platforms/elevator/shaft.animation.json")
});
