import { loadAnimation } from "#engine/animation";

export const propagandaTerminal = await loadAnimation(import("#/sprites/backgrounds/midground/propaganda-terminal.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/backgrounds/midground/propaganda-terminal.animation.json")
});
