import { loadAnimation } from "#engine/animation";

const sprite = import("#game/sprites/character/run.webp");
const spriteOptions = { removeBackground: true };

export const [run, jump] = await Promise.all([
  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#game/sprites/character/run.animation.json")
  }),

  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#game/sprites/character/jump.animation.json")
  })
]);
