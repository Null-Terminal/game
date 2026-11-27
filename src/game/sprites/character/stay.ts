import { loadAnimation } from "#engine/animation";

export const stay = await loadAnimation(import("#game/sprites/character/stay.webp"), {
  sprite: { removeBackground: true },
  animation: import("#game/sprites/character/stay.animation.json")
});
