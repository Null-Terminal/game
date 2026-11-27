import type { RenderPayload } from "#engine/game";
import { CollisionStatus, PhysicsObject } from "#engine/game-objects";
import type { RenderContext } from "#engine/rendering";

import { fly, flyEnd } from "#game/sprites/character/fly";
import { run, jump } from "#game/sprites/character/run";
import { stay } from "#game/sprites/character/stay";
import type { ProjectGame } from "#game/settings";

// Нажатие незадолго до приземления не теряется
const jumpBufferSeconds = 0.12;

export class PersonObject extends PhysicsObject {
  declare game: ProjectGame;

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
  #jumpBufferRemaining = 0;

  get input() {
    return this.game.input;
  }

  get actions() {
    return this.input.held;
  }

  init() {
    this.#fallPeak = 0;
    this.#grounded = false;
    this.#jumpBufferRemaining = 0;
    this.#forgiveFall = true;

    this.onDestroy(this.game.camera.bindTo(this));
    this.play(this.animations.stay);

    void this.input;
    this.initPhysics(this.#initPhysics, this.#initEffects);

    const subscription = this.canvas.events.ui.on(({ ctx }) => {
      this.#renderStats(ctx);
    });

    this.onDestroy(subscription);
  }

  consumeUse() {
    return this.input.consumePress("use");
  }

  #initPhysics = ({ delta }: RenderPayload) => {
    const { stats, actions } = this;

    if (this.input.consumePress("jump")) {
      this.#jumpBufferRemaining = jumpBufferSeconds;

    } else {
      this.#jumpBufferRemaining = Math.max(0, this.#jumpBufferRemaining - delta);
    }

    // Горизонтальное движение
    stats.vx = stats.speed;

    if (actions.has("left")) {
      this.effects.flipX = true;
      stats.vx *= -1;

    } else if (actions.has("right")) {
      this.effects.flipX = false;

    } else {
      stats.vx = 0;
    }

    if (this.#jumpBufferRemaining > 0 && stats.onGround) {
      this.#jumpBufferRemaining = 0;
      stats.vy += stats.jump;
      stats.onGround = false;
      this.ensurePlaying(this.animations.jump);

    } else if (actions.has("jetpack") && stats.fuel > 0) {
      if (!stats.usingJetpack) {
        this.#fallPeak = this.y;
        const intensity = Math.max(0, Math.min(1, this.game.settings.get("vibrationIntensity")));

        if (intensity > 0) {
          this.input.gamepad.playEffect("dual-rumble", {
            duration: 200,
            strongMagnitude: 0.15 * intensity,
            weakMagnitude: 0.6 * intensity
          });
        }
      }

      stats.vy = Math.max(stats.jetpack, stats.vy + stats.jetpack * delta);

      stats.onGround = false;
      stats.usingJetpack = true;

      this.updateStats(({ fuel }) => ({ fuel: fuel - stats.fuelPerTick }));

      this.ensurePlaying(this.animations.fly);

    } else if (stats.usingJetpack) {
      stats.usingJetpack = false;
      stats.vy = 0;

      this.ensurePlaying(this.animations.flyEnd);
    }

    if (stats.onGround) {
      if (actions.has("left") || actions.has("right")) {
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
