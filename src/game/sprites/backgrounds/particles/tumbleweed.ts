import { loadAnimation } from "#engine/animation";

export const tumbleweed = await loadAnimation(import("#game/sprites/backgrounds/particles/tumbleweed.webp"), {
  sprite: { removeBackground: true },
  animation: import("#game/sprites/backgrounds/particles/tumbleweed.animation.json")
});
