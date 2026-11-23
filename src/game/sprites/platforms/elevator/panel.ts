import { loadAnimation } from "#engine/animation";

const sprite = import("#game/sprites/platforms/elevator/panel.webp");
const spriteOptions = { removeBackground: true, tolerance: 30 };

const [idle, active] = await Promise.all([
  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#game/sprites/platforms/elevator/panel-idle.animation.json")
  }),

  loadAnimation(sprite, {
    sprite: spriteOptions,
    animation: import("#game/sprites/platforms/elevator/panel-active.animation.json")
  })
]);

export const panelSprites = { idle, active };
