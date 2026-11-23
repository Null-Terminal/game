import { loadAnimation } from "#engine/animation";

export const agentBillboard = await loadAnimation(import("#game/sprites/backgrounds/midground/agent-billboard.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#game/sprites/backgrounds/midground/agent-billboard.animation.json")
});
