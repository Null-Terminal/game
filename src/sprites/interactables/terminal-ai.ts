import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/terminal-ai.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

export const aiTerminal = {
  idle: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-ai.animation.json") }),
  activate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-ai-activate.animation.json") }),
  deactivate: await loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-ai-deactivate.animation.json") })
};
