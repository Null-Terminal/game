import { loadAnimation } from "#engine/animation";

export const roadsideGround = await loadAnimation(import("#/sprites/terrain/roadside-ground.webp"), {
  animation: import("#/sprites/terrain/roadside-ground.animation.json")
});
