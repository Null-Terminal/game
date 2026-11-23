import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/button-access.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [idle, press] = await Promise.all([
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-access.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/button-access-press.animation.json") })
]);

export const accessButton = { idle, press };
