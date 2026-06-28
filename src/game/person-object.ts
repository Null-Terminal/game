import { MovableObject, CollisionStatus } from "#engine/game-objects";
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

export class PersonObject extends MovableObject {
  static override animations = { stay, run, jump };
  declare readonly Animations: (typeof PersonObject)["animations"];

  init() {
    this.play(this.animations.stay);

    const SPEED = 300;
    const JUMP_FORCE = 1200;
    const GRAVITY = -2500;

    let vy = 0;
    let isOnGround = false;

    const keys = {
      ArrowLeft: 0,
      ArrowRight: 0,
      Space: 0
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
        keys[key as keyof typeof keys]++;
        e.preventDefault();
      }
    }, { signal: this.abortSignal });

    window.addEventListener("keyup", (e) => {
      const key = e.code;

      if (key in keys) {
        keys[key as keyof typeof keys] = 0;
        e.preventDefault();
      }
    }, { signal: this.abortSignal });

    let lastTime = performance.now();

    this.register(
      canvas.emitter.on(this.redrawEvent, ([now]) => {
        const delta = Math.min(0.025, (now - lastTime) / 1000);
        lastTime = now;

        // Горизонтальное движение
        let dx = SPEED * delta;

        if (keys.ArrowLeft) {
          this.effects.flipX = true;
          dx *= -1;

        } else if (keys.ArrowRight) {
          this.effects.flipX = false;

        } else {
          dx = 0;
        }

        // Прыжок
        if (keys.Space === 1 && isOnGround) {
          vy = JUMP_FORCE;
          isOnGround = false;
          this.ensurePlaying(this.animations.jump);
        }

        const dy = vy * delta;

        // Двигаем
        const status = this.move(dx, dy);

        // Врезались в потолок
        if (status & CollisionStatus.TopCollision) {
          vy = 0;

        } else if (status & CollisionStatus.BottomCollision) {
          isOnGround = true;
        }

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
      })
    );
  }
}
