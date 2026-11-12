import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/lever-floor.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [idle, activate, deactivate] = await Promise.all([
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-floor.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-floor-activate.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/lever-floor-deactivate.animation.json") })
]);

export const floorLever = { idle, activate, deactivate };
