import { loadAnimation } from "#engine/animation";

export const tumbleweed = await loadAnimation(import("#/sprites/backgrounds/particles/tumbleweed.webp"), {
  sprite: { removeBackground: true },
  animation: import("#/sprites/backgrounds/particles/tumbleweed.animation.json")
});
