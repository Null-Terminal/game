import { MotionObject } from "#engine/game-object";

import { loadAnimation } from "#engine/animation-loader";

const wall = await loadAnimation(import("#/sprites/wall.png"), {
  animation: import("#/sprites/wall.animation.json")
});

export class PlatformObject extends MotionObject {
  static override animations = { wall };
  declare readonly Animations: (typeof PlatformObject)["animations"];

  init() {
    this.play(this.animations.wall);

    let SPEED = 100;

    const { canvas } = this;

    let lastTime = performance.now();

    let totalY = 0;

    canvas.emitter.on(this.redrawEvent, ([now]) => {
      const delta = Math.min(0.025, (now - lastTime) / 1000);

      lastTime = now;

      const dy = SPEED * delta;

      // Двигаем
      this.move(0, dy);

      totalY = this.y;

      if (totalY > 600 || totalY < 180) {
        SPEED *= -1;
      }
    });
  }
}
