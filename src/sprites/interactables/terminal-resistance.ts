import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/terminal-resistance.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

export const resistanceTerminal = {
  idle: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-resistance.animation.json") }),
  activate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-resistance-activate.animation.json") }),
  deactivate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-resistance-deactivate.animation.json") })
};
