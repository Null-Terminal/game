import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/platforms/scaffold-plank.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [intact, broken] = await Promise.all([
  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/platforms/scaffold-plank.animation.json")
  }),

  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#/sprites/platforms/scaffold-plank-broken.animation.json")
  })
]);

export const scaffoldPlank = { intact, broken };
