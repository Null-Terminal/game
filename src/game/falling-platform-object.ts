import { CollisionStatus, GameObject, MovableObject, ifAlive } from "#engine/game-objects";

import { loadAnimation } from "#engine/animation-loader";

import type { DefaultGameObjectOptions, GameObjectOptions } from "#engine/game-objects/types";

import { PersonObject } from "#game/person-object";

const wall = await loadAnimation(import("#/sprites/bricks.webp"), {
  animation: import("#/sprites/bricks.animation.json")
});

export interface DefaultFallingPlatformObjectOptions extends DefaultGameObjectOptions {
  // Секунды после контакта с игроком. 0 — падает сразу.
  fallAfterSeconds?: number;
}

export class FallingPlatformObject extends MovableObject<GameObjectOptions<DefaultFallingPlatformObjectOptions>> {
  static override readonly animations = { wall };
  override readonly animations = FallingPlatformObject.animations;

  #triggered = false;

  override get redrawEvent() {
    return this.canvas.events.dynamic;
  }

  init() {
    this.#triggered = false;
    this.motion.toKinematic();
    this.play(this.animations.wall);
  }

  protected override bindFlush() {
    this.world.addToWorld(this, this.world.dynamics);
  }

  @ifAlive
  override visit(go: GameObject) {
    if (this.#triggered || !(go instanceof PersonObject)) {
      return;
    }

    this.#triggered = true;

    const fallAfterSeconds = this.options.fallAfterSeconds ?? 0;

    if (fallAfterSeconds <= 0) {
      this.#fall();
      return;
    }

    let elapsed = 0;

    const stop = this.onDestroy(this.canvas.emitter.on(this.redrawEvent, ({ delta }) => {
      elapsed += delta;

      if (elapsed < fallAfterSeconds) {
        return;
      }

      stop();
      this.#fall();
    }));
  }

  #fall() {
    this.motion.toSolid();
    this.movement.follow({ path: [] });
    this.initPhysics();
  }

  protected override onMove(status: number) {
    if (status & CollisionStatus.BottomCollision) {
      const [kind, index] = this.poolPointer;
      this.world.objects.delete(kind, index);
    }
  }
}
