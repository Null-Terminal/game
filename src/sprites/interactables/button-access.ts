import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/button-access.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

export const accessButton = {
  idle: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-access.animation.json") }),
  press: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-access-press.animation.json") })
};
