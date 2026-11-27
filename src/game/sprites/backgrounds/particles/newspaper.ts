import { loadAnimation } from "#engine/animation";

export const newspaper = await loadAnimation(import("#game/sprites/backgrounds/particles/newspaper.webp"), {
  sprite: { removeBackground: true },
  animation: import("#game/sprites/backgrounds/particles/newspaper.animation.json")
});
