import { loadAnimation } from "#engine/animation";

export const newspaper = await loadAnimation(import("#/sprites/backgrounds/particles/newspaper.webp"), {
  sprite: { removeBackground: true },
  animation: import("#/sprites/backgrounds/particles/newspaper.animation.json")
});
