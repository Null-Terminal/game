import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { RTreeEntry } from "#engine/rtree";

import { GameObject } from "#engine/game-objects/game-object";
import type { GameObjectOptions, PlayableAnimation } from "#engine/game-objects/game-object";

export class StaticObject<T extends GameObjectOptions = GameObjectOptions> extends GameObject<T> {
  init() {}

  override get redrawEvent() {
    return this.canvas.events.static;
  }

  protected get collisionTree() {
    return this.world.statics;
  }

  #entry: RTreeEntry | null = null;

  override create(game: Game, poolPointer: PoolPointer, opts?: T) {
    const options = super.create(game, poolPointer, opts);

    if (!(this.width > 0 && this.height > 0)) {
      throw new RangeError(`${this.name}.create: static collision needs width and height`);
    }

    this.#syncCollision();

    this.onDestroy(() => {
      const entry = this.#entry;

      if (entry != null) {
        this.collisionTree.remove(...entry);
        this.#entry = null;
      }
    });

    return options;
  }

  override play(animation: PlayableAnimation) {
    super.play(animation);

    if (this.#entry != null) {
      this.#syncCollision();
    }
  }

  #syncCollision() {
    this.#entry = this.world.addToWorld(this, this.collisionTree, this.#entry);
  }

  override reindex(index: number) {
    const entry = this.#entry;

    super.reindex(index);

    if (entry == null || entry[1] === index) {
      return;
    }

    if (this.collisionTree.reindex(...entry, index)) {
      entry[1] = index;
    }
  }
}
