import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/lever-wall.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

export const wallLever = {
  idle: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-wall.animation.json") }),
  activate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-wall-activate.animation.json") }),
  deactivate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-wall-deactivate.animation.json") })
};
