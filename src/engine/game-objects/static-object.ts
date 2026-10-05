import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { RTreeEntry } from "#engine/rtree";

import { GameObject } from "#engine/game-objects/game-object";
import type { GameObjectOptions } from "#engine/game-objects/types";

export abstract class StaticObject<T extends GameObjectOptions = GameObjectOptions> extends GameObject<T> {
  override get redrawEvent() {
    return this.canvas.events.static;
  }

  protected get collisionTree() {
    return this.world.statics;
  }

  #entry: RTreeEntry | null = null;

  override create(game: Game, poolPointer: PoolPointer, opts?: T) {
    const options = super.create(game, poolPointer, opts);

    this.world.addToWorld(this, this.collisionTree, (...entry) => {
      this.#entry = entry;

      this.onDestroy(() => {
        const saved = this.#entry;

        if (saved == null) {
          return;
        }

        this.collisionTree.remove(...saved);
        this.#entry = null;
      });
    });

    return options;
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
