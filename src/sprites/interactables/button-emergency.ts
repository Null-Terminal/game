import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/button-emergency.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [idle, press] = await Promise.all([
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-emergency.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-emergency-press.animation.json") })
]);

export const emergencyButton = { idle, press };
