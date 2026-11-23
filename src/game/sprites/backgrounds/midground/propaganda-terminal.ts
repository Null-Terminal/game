import { loadAnimation } from "#engine/animation";

export const propagandaTerminal = await loadAnimation(import("#game/sprites/backgrounds/midground/propaganda-terminal.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/propaganda-terminal.animation.json")
});
