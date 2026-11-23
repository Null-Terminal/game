import { loadAnimation } from "#engine/animation";

const sprite = import("#/sprites/interactables/terminal-ai.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [idle, activate, deactivate] = await Promise.all([
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-ai.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-ai-activate.animation.json") }),
  loadAnimation(sprite, { sprite: spriteOptions, animation: import("#/sprites/interactables/terminal-ai-deactivate.animation.json") })
]);

export const aiTerminal = { idle, activate, deactivate };
