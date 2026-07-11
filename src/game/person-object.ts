import { MovableObject } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

import { UsefulObject } from "#game/useful-object";

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
  static override readonly animations = { stay, run, jump };
  override readonly animations = PersonObject.animations;

  static override readonly stats = {
    ...MovableObject.stats,
    speed: 300,
    jump: 2500,
    jetpack: 35,
    usingJetpack: false,
    fuel: 100,
    fuelPerTick: 0.1
  };

  override readonly stats = PersonObject.stats;

  readonly actions = {
    left: 0,
    right: 0,
    jump: 0,
    jetpack: 0,
    use: 0
  };

  readonly controls: Record<string, keyof PersonObject["actions"]> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    Space: "jump",
    ShiftLeft: "jetpack",
    KeyE: "use",
  };

  init() {
    this.register(this.game.camera.bindTo(this));
    this.play(this.animations.stay);

    this.#initControls();
    this.initPhysics(this.#initPhysics, this.#initEffects);

    this.register(
      this.canvas.emitter.on(this.canvas.events.ui, ({ ctx }) => {
        this.#renderStats(ctx);
      })
    );
  }

  #initPhysics = () => {
    const { stats, actions } = this;

    // Горизонтальное движение
    stats.vx = stats.speed;

    if (actions.left) {
      this.effects.flipX = true;
      stats.vx *= -1;

    } else if (actions.right) {
      this.effects.flipX = false;

    } else {
      stats.vx = 0;
    }

    if (actions.jump === 1 && stats.onGround) {
      stats.vy += stats.jump;
      stats.onGround = false;
      this.ensurePlaying(this.animations.jump);

    } else if (actions.jetpack && stats.fuel > 0) {
      stats.vy = Math.max(stats.jetpack, stats.vy + stats.jetpack);

      stats.onGround = false;
      stats.usingJetpack = true;

      stats.fuel = Math.max(0, stats.fuel - stats.fuelPerTick);
      actions.jump = 0;

      this.ensurePlaying(this.animations.jump);

    } else if (stats.usingJetpack) {
      stats.usingJetpack = false;
      stats.vy = 0;
    }

    if (stats.onGround) {
      if (actions.left || actions.right) {
        this.ensurePlaying(this.animations.run);

      } else {
        this.ensurePlaying(this.animations.stay);
      }
    }
  };

  #initEffects = () => {
    this.findInteractCollisions().forEach(({ object }) => {
      if (object instanceof UsefulObject) {
        object.visit(this);
      }
    });
  };

  #initControls() {
    const { canvas, actions, controls } = this;

    window.addEventListener("keydown", (e) => {
      const key = e.code;

      if (e.code === "Escape") {
        e.preventDefault();
        canvas.togglePause();

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
