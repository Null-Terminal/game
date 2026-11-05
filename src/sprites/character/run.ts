import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/character/run.webp");
const spriteOptions = { removeBackground: true };

export const [run, jump] = await Promise.all([
  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/character/run.animation.json")
  }),

  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/character/jump.animation.json")
  })
]);
