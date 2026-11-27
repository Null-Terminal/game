import { loadAnimation } from "#engine/animation";

export const terminalStand = await loadAnimation(import("#game/sprites/interactables/terminal-stand.webp"), {
  animation: import("#game/sprites/interactables/terminal-stand.animation.json")
});
