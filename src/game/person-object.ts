import { MotionObject, type Animations } from "#engine/motion-object";
import { loadSprite } from "#engine/sprite-loader";
import { SpriteAnimation } from "#/sprite-animation";

import runAnimation from "#/sprites/run.animation.json";
import run from "#/sprites/run.png";

const image = await loadSprite(run, { removeBackground: true });

export class PersonObject extends MotionObject {
  static override animations = {
    run: [image, new SpriteAnimation(runAnimation.sprites)],
  } satisfies Animations;

  declare readonly Animations: (typeof PersonObject)["animations"];

  init() {
    this.play(this.animations.run);

    const SPEED = 300;
    const JUMP_FORCE = -800;
    const GRAVITY = 2500;

    let vy = 0;
    let isOnGround = true;

    const keys = {
      ArrowLeft: false,
      ArrowRight: false,
      Space: false
    };

    const { canvas } = this;

    window.addEventListener("keydown", (e) => {
      const key = e.code;

      if (e.code === "Escape") {
        e.preventDefault();

        if (canvas.isPaused()) {
          canvas.resume();

        } else {
          canvas.pause();
        }

      } else if (e.code in keys) {
        keys[key as keyof typeof keys] = true;
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.code;

      if (key in keys) {
        keys[key as keyof typeof keys] = false;
        e.preventDefault();
      }
    });

    let lastTime = performance.now();

    canvas.emitter.on(canvas.events.redraw, ([now]) => {
      const delta = Math.min(0.025, (now - lastTime) / 1000);

      lastTime = now;

      // Горизонтальное движение
      let dx = 0;

      if (keys.ArrowRight) {
        dx += SPEED * delta;
      }

      if (keys.ArrowLeft) {
        dx -= SPEED * delta;
      }

      // Прыжок
      if (keys.Space && isOnGround) {
        vy = JUMP_FORCE;
        isOnGround = false;
        keys.Space = false;
      }

      if (keys.ArrowLeft) {
        this.effects.flipX = true;
      }

      if (keys.ArrowRight) {
        this.effects.flipX = false;
      }

      const dy = vy * delta;

      // Запоминаем позицию до движения
      const oldY = this.y;

      // Двигаем
      this.move(dx, dy);

      // Врезались в потолок
      if (oldY + dy < this.y) {
        vy = 0;
      }

      isOnGround = dy > 0 && this.y === oldY;

      if (isOnGround) {
        vy = 0;

      } else {
        // Гравитация
        vy += GRAVITY * delta;
      }
    });
  }
}
