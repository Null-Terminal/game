import { loadAnimation } from "#engine/animation";

const sprite = import("#game/sprites/character/fly.webp");
const spriteOptions = { removeBackground: true };

export const [fly, flyEnd] = await Promise.all([
  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#game/sprites/character/fly.animation.json")
  }),

  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#game/sprites/character/fly-end.animation.json")
  })
]);
