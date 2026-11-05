import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/button-emergency.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

export const emergencyButton = {
  idle: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-emergency.animation.json") }),
  press: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-emergency-press.animation.json") })
};
