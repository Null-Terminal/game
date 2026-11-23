import { loadAnimation } from "#engine/animation";

export const roadsideGround = await loadAnimation(import("#game/sprites/terrain/roadside-ground.webp"), {
  animation: import("#game/sprites/terrain/roadside-ground.animation.json")
});
