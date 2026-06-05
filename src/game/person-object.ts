import { MotionObject } from "#engine/motion-object";
import { loadAnimation } from "#engine/animation-loader";

const [stay, run, jump] = await Promise.all([
  loadAnimation(import("#/sprites/run.webp"), {
    sprite: { removeBackground: true, tolerance: 120 },
    animation: import("#/sprites/stay.animation.json")
  }),

  loadAnimation(import("#/sprites/run.webp"), {
    sprite: { removeBackground: true, tolerance: 120 },
    animation: import("#/sprites/run.animation.json")
  }),

  loadAnimation(import("#/sprites/run.webp"), {
    sprite: { removeBackground: true, tolerance: 120 },
    animation: import("#/sprites/jump.animation.json")
  })
]);

export class PersonObject extends MotionObject {
  static override animations = { stay, run, jump };
  declare readonly Animations: (typeof PersonObject)["animations"];

  init() {
    this.play(this.animations.stay);

    const SPEED = 300;
    const JUMP_FORCE = -1000;
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
        this.ensurePlaying(this.animations.jump);
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
        if (keys.ArrowLeft || keys.ArrowRight) {
          this.ensurePlaying(this.animations.run);

        } else {
          this.ensurePlaying(this.animations.stay);
        }
      }

      if (isOnGround) {
        vy = GRAVITY;

      } else {
        // Гравитация
        vy += GRAVITY * delta;
      }
    });
  }
}
