import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/terminal-resistance.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [idle, activate, deactivate] = await Promise.all([
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-resistance.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-resistance-activate.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-resistance-deactivate.animation.json") })
]);

export const resistanceTerminal = { idle, activate, deactivate };
