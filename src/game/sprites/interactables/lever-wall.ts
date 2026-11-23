import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/lever-wall.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [idle, activate, deactivate] = await Promise.all([
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-wall.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-wall-activate.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-wall-deactivate.animation.json") })
]);

export const wallLever = { idle, activate, deactivate };
