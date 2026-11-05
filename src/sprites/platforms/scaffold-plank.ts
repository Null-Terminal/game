import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/platforms/scaffold-plank.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

export const scaffoldPlank = {
  intact: await loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/platforms/scaffold-plank.animation.json")
  }),

  broken: await loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/platforms/scaffold-plank-broken.animation.json")
  })
};
