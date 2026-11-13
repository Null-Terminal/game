import type { LoadedAnimation } from "#engine/animation";
import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { CollisionStatus, ColliderObject, ifAlive } from "#engine/game-objects";
import type { GameObject } from "#engine/game-objects";
import type { DefaultGameObjectOptions, GameObjectOptions } from "#engine/game-objects/game-object";

import { PersonObject } from "#game/person-object";

export interface DefaultFallingPlatformObjectOptions extends DefaultGameObjectOptions {
  show: LoadedAnimation;
  showBroken: LoadedAnimation;
  fallAfterSeconds?: number;
  maxStepHeight?: number;
}

export type FallingPlatformOptions = GameObjectOptions<DefaultFallingPlatformObjectOptions>;

export class FallingPlatformObject extends ColliderObject<FallingPlatformOptions> {
  #triggered = false;

  override create(game: Game, poolPointer: PoolPointer, opts?: FallingPlatformOptions) {
    return super.create(game, poolPointer, opts == null ? opts : {
      fallAfterSeconds: 0,
      maxStepHeight: 8,
      ...opts
    });
  }

  override get redrawEvent() {
    return this.canvas.events.scene;
  }

  override init() {
    this.#triggered = false;
    this.motion.toKinematic();
  }

  override allows(go: GameObject, kind: "stepUp", height: number): boolean;
  override allows(go: GameObject, kind: string, options?: unknown): boolean | null;
  override allows(_go: GameObject, kind: string, options?: unknown): boolean | null {
    if (kind !== "stepUp") {
      return null;
    }

    return typeof options === "number" && options <= this.options.maxStepHeight!;
  }

  @ifAlive
  override visit(go: GameObject) {
    if (this.#triggered || !(go instanceof PersonObject)) {
      return;
    }

    this.#triggered = true;

    const fallAfterSeconds = this.options.fallAfterSeconds!;

    if (fallAfterSeconds <= 0) {
      this.#fall();
      return;
    }

    let elapsed = 0;

    const stop = this.render.on(this.redrawEvent, ({ delta }) => {
      elapsed += delta;

      if (elapsed < fallAfterSeconds) {
        return;
      }

      stop();
      this.#fall();
    });
  }

  #fall() {
    this.play(this.options.showBroken);
    this.motion.toSolid();
    this.movement.follow({ path: [] });
    this.initPhysics();
  }

  protected override onMove(status: number) {
    super.onMove(status);

    if (status & CollisionStatus.BottomCollision) {
      this.destroy();
    }
  }
}
