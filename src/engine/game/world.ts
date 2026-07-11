import { Disposable } from "#engine/disposable";

import { RTree, type RTreePredicate } from "#engine/rtree";
import { GameObjectPool, type PoolPointer } from "#engine/game-object-pool";

import type { Game } from "#engine/game";
import type { GameObject } from "#engine/game-objects";

import type { WorldObject, WorldOptions, Collision } from "#engine/game/world/types";

export * from "#engine/game/world/types";

export class World extends Disposable {
  readonly game: Game;
  readonly options: Required<WorldOptions>;

  readonly statics = new RTree();
  readonly dynamics = new RTree();
  readonly interacts = new RTree();

  readonly objects = new GameObjectPool();

  constructor(game: Game, opts: WorldOptions) {
    super();

    this.game = game;
    this.options = { ...opts };

    this.register(
      game.canvas.emitter.on(game.canvas.events.background, () => {
        this.dynamics.clear();
        this.interacts.clear();
      })
    );

    this.nextTick(() => {
      for (const elem of opts.objects) {
        this.createObject(elem[0], elem[1]);
      }
    });
  }

  createObject(go: WorldObject[0], opts?: WorldObject[1]): PoolPointer {
    return this.objects.add(go, this.game, opts);
  }

  addToWorld(go: GameObject, world: RTree) {
    const ptr = go.poolPointer;

    const width = go.x + go.width || Infinity;
    const height = go.y + go.height || Infinity;

    world.insert(ptr[0], ptr[1], go.x, go.y, width, height);
  }

  hasCollision(minX: number, minY: number, maxX: number, maxY: number): boolean {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);

    if (this.dynamics.searchFirst(x1, y1, x2, y2, pred) == null) {
      return this.statics.searchFirst(x1, y1, x2, y2, pred) != null;
    }

    return true;
  }

  findDynamicCollision(minX: number, minY: number, maxX: number, maxY: number): Collision | null {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);
    const collision = this.dynamics.searchFirst(x1, y1, x2, y2, pred);

    if (collision != null) {
      return {
        bbox: collision.bbox,
        object: this.objects.get(collision.pointer[0], collision.pointer[1])!
      };
    }

    return collision;
  }

  findInteractCollision(minX: number, minY: number, maxX: number, maxY: number): Collision | null {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);
    const collision = this.interacts.searchFirst(x1, y1, x2, y2, pred);

    if (collision != null) {
      return {
        bbox: collision.bbox,
        object: this.objects.get(collision.pointer[0], collision.pointer[1])!
      };
    }

    return collision;
  }

  findCollisions(minX: number, minY: number, maxX: number, maxY: number): Collision[] {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);

    return this.dynamics
      .search(x1, y1, x2, y2, pred)
      .concat(this.statics.search(x1, y1, x2, y2, pred))
      .map(({ bbox, pointer: [kind, i] }) => {
        return {
          bbox,
          object: this.objects.get(kind, i)!
        };
      })!;
  }

  #getCollisionPredicate(minX: number, minY: number, maxX: number, maxY: number): RTreePredicate {
    return ({ bbox }) => maxX > bbox[0] && minX < bbox[2] && maxY > bbox[1] && minY < bbox[3];
  }
}
