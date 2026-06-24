import { Disposable } from "#engine/disposable";

import { RTree, type RTreePred } from "#engine/rtree";
import { GameObjectPool, type PoolPointer } from "#engine/game-object-pool";

import type { Game } from "#engine/game";
import type { GameObject } from "#engine/game-object";

import type { WorldObject, WorldOptions, Collision } from "#engine/game/world/types";

export * from "#engine/game/world/types";

export class World extends Disposable {
  readonly game: Game;
  readonly options: Required<WorldOptions>;

  #staticWorld = new RTree();
  #dynamicWorld = new RTree();
  #objectPool = new GameObjectPool();

  constructor(game: Game, opts: WorldOptions) {
    super();

    this.game = game;
    this.options = { ...opts };

    this.register(
      game.canvas.emitter.on(game.canvas.events.background, () => {
        this.#dynamicWorld.clear();
      })
    );

    queueMicrotask(() => {
      for (const elem of opts.staticWorld) {
        this.createObject(elem[0], elem[1]);
      }
    });
  }

  createObject(object: WorldObject[0], opts?: WorldObject[1]): PoolPointer {
    return this.#objectPool.add(object, this.game, opts);
  }

  addToStaticWorld(object: GameObject) {
    this.#staticWorld.insert(
      object.poolPointer[0],
      object.poolPointer[1],

      object.x,
      object.y,
      object.x + object.width,
      object.y + object.height
    );
  }

  addToDynamicWorld(object: GameObject) {
    this.#dynamicWorld.insert(
      object.poolPointer[0],
      object.poolPointer[1],

      object.x,
      object.y,
      object.x + object.width,
      object.y + object.height
    );
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

  findDynamicCollision(minX: number, minY: number, maxX: number, maxY: number): Collision | null {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred: RTreePred = ({ bbox }) =>
      maxX > bbox[0] && minX < bbox[2] && maxY > bbox[1] && minY < bbox[3];

    const collision = this.#dynamicWorld.searchFirst(x1, y1, x2, y2, pred);

    if (collision != null) {
      return {
        bbox: collision.bbox,
        object: this.#objectPool.get(collision.pointer[0], collision.pointer[1])!
      };
    }

    return collision;
  }

  findCollisions(minX: number, minY: number, maxX: number, maxY: number): Collision[] {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred: RTreePred = ({ bbox }) =>
      maxX > bbox[0] && minX < bbox[2] && maxY > bbox[1] && minY < bbox[3];

    return this.#dynamicWorld
      .search(x1, y1, x2, y2, pred)
      .concat(this.#staticWorld.search(x1, y1, x2, y2, pred))
      .map(({ bbox, pointer: [kind, i] }) => {
        return {
          bbox,
          object: this.#objectPool.get(kind, i)!
        };
      })!;
  }
}
