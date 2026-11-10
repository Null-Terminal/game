import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { PhysicsObject } from "#engine/game-objects/physics-object";
import type { GameObjectOptions, PlayableAnimation } from "#engine/game-objects/game-object";
import { CollisionBody, type CollisionShape } from "#engine/game-objects/collider-object/body";

export { CollisionBody } from "#engine/game-objects/collider-object/body";

export class ColliderObject<T extends GameObjectOptions = GameObjectOptions> extends PhysicsObject<T> {
  readonly collision = new CollisionBody(this);

  init() {}

  protected addCollisionShape(shape: CollisionShape) {
    this.collision.addShape(shape);
  }

  override get redrawEvent() {
    return this.canvas.events.scene;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    const options = super.create(game, poolPointer, opts);

    try {
      this.collision.mount();

    } catch (error) {
      this.destroy();
      throw error;
    }

    return options;
  }

  override destroy() {
    super.destroy();
    this.collision.destroy();
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
