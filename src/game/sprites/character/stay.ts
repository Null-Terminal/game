import { loadAnimation } from "#engine/animation";

export const stay = await loadAnimation(import("#/sprites/character/stay.webp"), {
  sprite: { removeBackground: true },
  animation: import("#/sprites/character/stay.animation.json")
});
