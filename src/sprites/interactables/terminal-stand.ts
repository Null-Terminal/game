import { loadAnimation } from "#engine/animation";

export const terminalStand = await loadAnimation(import("#/sprites/interactables/terminal-stand.webp"), {
  animation: import("#/sprites/interactables/terminal-stand.animation.json")
});
