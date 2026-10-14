import { CollisionStatus, MovableObject, type RenderPayload } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

const [stay, run, jump, fly, flyEnd] = await Promise.all([
  loadAnimation(import("#/sprites/stay.webp"), {
    sprite: { removeBackground: true },
    animation: import("#/sprites/stay.animation.json")
  }),

  loadAnimation(import("#/sprites/run.webp"), {
    sprite: { removeBackground: true },
    animation: import("#/sprites/run.animation.json")
  }),

  loadAnimation(import("#/sprites/run.webp"), {
    sprite: { removeBackground: true } ,
    animation: import("#/sprites/jump.animation.json")
  }),

  loadAnimation(import("#/sprites/fly.webp"), {
    sprite: { removeBackground: true },
    animation: import("#/sprites/fly.animation.json")
  }),

  loadAnimation(import("#/sprites/fly.webp"), {
    sprite: { removeBackground: true },
    animation: import("#/sprites/fly-end.animation.json")
  })
]);

export class PersonObject extends MovableObject {
  static override readonly animations = { stay, run, jump, fly, flyEnd };
  override readonly animations = PersonObject.animations;

  static override readonly stats = {
    ...MovableObject.stats,
    speed: 300,
    jump: 2500,
    jetpack: 350,
    usingJetpack: false,
    fuel: 1000,
    fuelMax: 1000,
    fuelPerTick: 0.1,
    hp: 100,
    hpMax: 100,
    fallSafe: 200,
    fallDamage: 0.05
  };

  override get stats() {
    return super.stats as typeof PersonObject.stats;
  }

  override updateState(patch: (stats: PersonObject["stats"]) => Partial<PersonObject["stats"]>) {
    const next = patch(this.stats);

    if (next.hp != null) {
      next.hp = Math.max(0, Math.min(this.stats.hpMax, next.hp));

      if (next.hp === 0 && this.stats.hp > 0) {
        this.game.status.finish();
      }
    }

    if (next.fuel != null) {
      next.fuel = Math.max(0, Math.min(this.stats.fuelMax, next.fuel));
    }

    super.updateState(() => next);
  }

  #fallPeak = 0;
  #forgiveFall = true;
  #grounded = false;

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
    ArrowUp: "jetpack",
    KeyE: "use",
  };

  init() {
    this.#fallPeak = 0;
    this.#grounded = false;
    this.#forgiveFall = true;

    this.onDestroy(this.game.camera.bindTo(this));
    this.play(this.animations.stay);

    this.#initControls();
    this.initPhysics(this.#initPhysics, this.#initEffects);

    this.onDestroy(
      this.canvas.emitter.on(this.canvas.events.ui, ({ ctx }) => {
        this.#renderStats(ctx);
      })
    );
  }

  #initPhysics = ({ delta }: RenderPayload) => {
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
      stats.vy = Math.max(stats.jetpack, stats.vy + stats.jetpack * delta);

      stats.onGround = false;
      stats.usingJetpack = true;

      this.updateState(({ fuel }) => ({ fuel: fuel - stats.fuelPerTick }));
      actions.jump = 0;

      this.ensurePlaying(this.animations.fly);

    } else if (stats.usingJetpack) {
      stats.usingJetpack = false;
      stats.vy = 0;

      this.ensurePlaying(this.animations.flyEnd);
    }

    if (stats.onGround) {
      if (actions.left || actions.right) {
        this.ensurePlaying(this.animations.run);

      } else {
        this.ensurePlaying(this.animations.stay);
      }
    }
  };

  #initEffects = (moveStatus: number) => {
    this.findInteractCollisions().forEach(({ object }) => {
      object.visit(this);
    });

    const grounded = (moveStatus & CollisionStatus.BottomCollision) !== 0;

    if (grounded) {
      if (!this.#grounded && !this.#forgiveFall) {
        this.#applyFallDamage();
      }

      this.#fallPeak = this.y;
      this.#forgiveFall = false;

    } else {
      this.#fallPeak = Math.max(this.#fallPeak, this.y);
    }

    this.#grounded = grounded;
  };

  #applyFallDamage() {
    const extra = this.#fallPeak - this.y - this.stats.fallSafe;

    if (extra <= 0) {
      return;
    }

    this.updateState(({ hp }) => ({ hp: hp - extra * this.stats.fallDamage }));
  }

  #initControls() {
    const { actions, controls } = this;

    window.addEventListener("keydown", (e) => {
      const key = e.code;

      if (key in controls) {
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
    const padding = 10;
    const { hp, hpMax, fuel, fuelMax } = this.stats;
    const lines = [
      `HP: ${hp.toFixed(0)}/${hpMax}`,
      `FUEL: ${fuel.toFixed(0)}/${fuelMax}`
    ];

    ctx.font = "16px monospace";
    ctx.fillStyle = "#00FF00";

    lines.forEach((text, index) => {
      ctx.fillText(text, this.canvas.width - ctx.measureText(text).width - padding, 30 + index * 20);
    });
  }
}
