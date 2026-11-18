import { PhysicsObject } from "#engine/game-objects/physics-object";
import { CollisionBody, type CollisionShape } from "#engine/game-objects/collider-object/body";

import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { GameObjectOptions, PlayableAnimation, StateValue } from "#engine/game-objects";

export { CollisionBody } from "#engine/game-objects/collider-object/body";

export class ColliderObject<T extends GameObjectOptions = GameObjectOptions> extends PhysicsObject<T> {
  readonly collision = new CollisionBody(this);

  constructor() {
    super();

    const { emitter, events } = this.status;
    emitter.on(events.sleepChange, (sleeping) => this.collision.setSleeping(sleeping));
  }

  init() {}

  protected addCollisionShape(shape: CollisionShape) {
    this.collision.addShape(shape);
  }

  override get redrawEvent() {
    return this.canvas.events.scene;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T, snapshot?: StateValue): T {
    const resolvedOptions = super.create(game, poolPointer, opts, snapshot);

    try {
      this.collision.mount();

    } catch (err) {
      this.destroy();
      throw err;
    }

    return resolvedOptions;
  }

  override destroy() {
    if (this.destroyed) {
      return;
    }

    this.collision.destroy();
    super.destroy();
  }

  override reindex(index: number) {
    super.reindex(index);
    this.collision.reindex(index);
  }

  override play(animation: PlayableAnimation) {
    super.play(animation);
    this.collision.geometryChanged();
  }

  protected override bindFlush() {
    this.collision.flush(this.canvas.delta);
  }

  protected override onMove(_status: number) {
    this.collision.moved();
  }
}
