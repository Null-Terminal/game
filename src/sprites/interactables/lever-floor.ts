import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/lever-floor.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

export const floorLever = {
  idle: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-floor.animation.json") }),
  activate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-floor-activate.animation.json") }),
  deactivate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-floor-deactivate.animation.json") })
};
