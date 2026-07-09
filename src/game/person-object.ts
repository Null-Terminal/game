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

  readonly stats = {
    speed: 300,
    gravity: -1800,
    jump: 2500,
    jetpack: 35,
    fuel: 100,
    fuelPerTick: 0.1
  };

  readonly actions = {
    left: 0,
    right: 0,
    jump: 0,
    jetpack: 0
  };

  readonly controls: Record<string, keyof PersonObject["actions"]> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    Space: "jump",
    AltLeft: "jetpack",
  };

  init() {
    this.register(this.game.camera.bindTo(this));
    this.play(this.animations.stay);

    this.#initControls();
    this.#initPhysics();

    this.register(
      this.canvas.emitter.on(this.canvas.events.overlay, ([, ctx]) => {
        this.#renderStats(ctx);
      })
    );
  }

  #initPhysics() {
    const { actions, stats } = this;

    let isOnGround = false;
    let usingJetpack = false;

    let vy = 0;
    let lastTime = performance.now();

    this.register(
      this.canvas.emitter.on(this.redrawEvent, ([now]) => {
        const delta = Math.min(0.025, (now - lastTime) / 1000);
        lastTime = now;

        // Горизонтальное движение
        let dx = stats.speed * delta;

        if (actions.left) {
          this.effects.flipX = true;
          dx *= -1;

        } else if (actions.right) {
          this.effects.flipX = false;

        } else {
          dx = 0;
        }

        if (actions.jump === 1 && isOnGround) {
          vy += stats.jump;
          isOnGround = false;
          this.ensurePlaying(this.animations.jump);

        } else if (actions.jetpack && stats.fuel > 0) {
          vy = Math.max(stats.jetpack, vy + stats.jetpack);

          isOnGround = false;
          usingJetpack = true;

          stats.fuel = Math.max(0, stats.fuel - stats.fuelPerTick);
          actions.jump = 0;

          this.ensurePlaying(this.animations.jump);

        } else if (usingJetpack) {
          usingJetpack = false;
          vy = 0;
        }

        // Гравитация
        vy = Math.max(stats.gravity, vy + stats.gravity * delta);

        const dy = vy * delta;

        const moveStatus = this.move(dx, dy);

        // Врезались в потолок
        if (moveStatus & CollisionStatus.TopCollision) {
          vy = 0;

        } else if (moveStatus & CollisionStatus.BottomCollision) {
          isOnGround = true;
          vy = stats.gravity;
        }

        if (isOnGround) {
          if (actions.left || actions.right) {
            this.ensurePlaying(this.animations.run);

          } else {
            this.ensurePlaying(this.animations.stay);
          }
        }
      })
    );
  }

  #initControls() {
    const { canvas, actions, controls } = this;

    window.addEventListener("keydown", (e) => {
      const key = e.code;

      if (e.code === "Escape") {
        e.preventDefault();

        if (canvas.isPaused()) {
          canvas.resume();

        } else {
          canvas.pause();
        }

      } else if (key in controls) {
        e.preventDefault();

        const control = controls[key]!;

        if (control in actions) {
          actions[control] = Math.min(2, actions[control] + 1);
        }
      }
    }, { signal: this.abortSignal });

    window.addEventListener("keyup", (e) => {
      const key = e.code;

      if (key in controls) {
        e.preventDefault();

        const control = controls[key]!;

        if (control in actions) {
          actions[control] = 0;
        }
      }
    }, { signal: this.abortSignal });
  }

  #renderStats(ctx: CanvasRenderingContext2D) {
    const left = this.canvas.width - 100;
    const top = 30;

    ctx.font = "16px monospace";
    ctx.fillStyle = "#00FF00";
    ctx.fillText(`FUEL: ${this.stats.fuel.toFixed(0)}`, left, top);
  }
}
