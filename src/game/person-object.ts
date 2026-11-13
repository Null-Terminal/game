import type { RenderPayload } from "#engine/game";
import { CollisionStatus, PhysicsObject } from "#engine/game-objects";
import type { RenderContext } from "#engine/rendering";

import { fly, flyEnd } from "#/sprites/character/fly";
import { run, jump } from "#/sprites/character/run";
import { stay } from "#/sprites/character/stay";

export class PersonObject extends PhysicsObject {
  static override readonly animations = { stay, run, jump, fly, flyEnd };
  override readonly animations = PersonObject.animations;

  static override readonly stats = {
    ...PhysicsObject.stats,
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

  override updateStats(patch: (stats: PersonObject["stats"]) => Partial<PersonObject["stats"]>) {
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

    super.updateStats(() => next);
  }

  #fallPeak = 0;
  #forgiveFall = true;
  #grounded = false;
  #usePressed = false;

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
    this.#usePressed = false;

    this.onDestroy(this.game.camera.bindTo(this));
    this.play(this.animations.stay);

    this.#initControls();
    this.initPhysics(this.#initPhysics, this.#initEffects);

    const subscription = this.canvas.emitter.on(this.canvas.events.ui, ({ ctx }) => {
      this.#renderStats(ctx);
    });

    this.onDestroy(() => subscription.dispose());
  }

  consumeUse() {
    if (!this.#usePressed) {
      return false;
    }

    this.#usePressed = false;
    return true;
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
      if (!stats.usingJetpack) {
        this.#fallPeak = this.y;
      }

      stats.vy = Math.max(stats.jetpack, stats.vy + stats.jetpack * delta);

      stats.onGround = false;
      stats.usingJetpack = true;

      this.updateStats(({ fuel }) => ({ fuel: fuel - stats.fuelPerTick }));
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

    this.updateStats(({ hp }) => ({ hp: hp - extra * this.stats.fallDamage }));
  }

  #initControls() {
    const { actions, controls } = this;

    window.addEventListener("keydown", (e) => {
      const key = e.code;

      if (key in controls) {
        e.preventDefault();
        const control = controls[key]!;

        if (control in actions) {
          if (control === "use" && !e.repeat && actions.use === 0) {
            this.#usePressed = true;
          }

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

          if (control === "use") {
            this.#usePressed = false;
          }
        }
      }
    }, { signal: this.abortSignal });
  }

  #renderStats(ctx: RenderContext) {
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
