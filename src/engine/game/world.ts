import { RTree, type RTreePred } from "#engine/rtree";
import { GameObjectPool, type PoolPointer } from "#engine/game-object-pool";

import type { Game } from "#engine/game";
import type { GameObject } from "#engine/game-object";

import type { WorldObject, WorldOptions } from "#engine/game/world/types";

export * from "#engine/game/world/types";

export class World {
  readonly game: Game;
  readonly options: Required<WorldOptions>;

  #staticWorld = new RTree();
  #dynamicWorld = new RTree();
  #objectPool = new GameObjectPool();

  constructor(game: Game, opts: WorldOptions) {
    this.game = game;
    this.options = { ...opts };

    game.canvas.emitter.on(game.canvas.events.background, () => {
      this.#dynamicWorld.clear();
    });

    for (const elem of opts.staticWorld) {
      const opts = elem.object[1];

      if (opts.effects?.scale != null) {
        const { scale } = opts.effects;

        for (let i = 0; i < elem.bbox.length; i++) {
          elem.bbox[i]! *= scale;
        }
      }

      const ptr = this.createObject(elem.object[0], {
        bbox: elem.bbox,
        ...elem.object[1]
      });

      this.#staticWorld.insert(...ptr, ...elem.bbox);
    }
  }

  createObject(object: WorldObject[0], opts?: WorldObject[1]): PoolPointer {
    return this.#objectPool.add(object, this.game, opts);
  }

  addToDynamicWorld(object: GameObject) {
    this.#dynamicWorld.insert(object.poolPointer[0], object.poolPointer[1], object.x, object.y, object.width, object.height);
  }

  addToStaticWorld(object: GameObject) {
    this.#staticWorld.insert(object.poolPointer[0], object.poolPointer[1], object.x, object.y, object.width, object.height);
  }

  hasCollision(minX: number, minY: number, maxX: number, maxY: number): boolean {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred: RTreePred = ({ bbox }) =>
      maxX > bbox[0] && minX < bbox[2] && maxY > bbox[1] && minY < bbox[3];

    if (this.#dynamicWorld.searchFirst(x1, y1, x2, y2, pred) == null) {
      return this.#staticWorld.searchFirst(x1, y1, x2, y2, pred) != null;
    }

    return true;
  }

  findCollisions(minX: number, minY: number, maxX: number, maxY: number): GameObject[] {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred: RTreePred = ({ bbox }) =>
      maxX > bbox[0] && minX < bbox[2] && maxY > bbox[1] && minY < bbox[3];

    return this.#dynamicWorld
      .search(x1, y1, x2, y2, pred)
      .concat(this.#staticWorld.search(x1, y1, x2, y2, pred))
      .map(({ pointer: [kind, i] }) => this.#objectPool.get(kind, i)!)!;
  }
}
