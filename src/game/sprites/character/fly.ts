import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/character/fly.webp");
const spriteOptions = { removeBackground: true };

export const [fly, flyEnd] = await Promise.all([
  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/character/fly.animation.json")
  }),

  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/character/fly-end.animation.json")
  })
]);
