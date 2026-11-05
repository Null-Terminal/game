import { cast } from "#/tstools";
import { LoadedAnimation } from "#engine/animation";
import { Disposable } from "#engine/disposable";

import { RTree, type RTreeEntry, type RTreePredicate, type RTreePublicNode } from "#engine/rtree";
import { GameObjectPool, type PoolPointer } from "#engine/game-object-pool";

import type { Game } from "#engine/game";
import type { GameObject, CreateOptionsOf } from "#engine/game-objects";

import type * as t from "#engine/game/world/types";

export type * from "#engine/game/world/types";

export class World extends Disposable {
  static of<const T extends [new (...args: any[]) => GameObject, object?][]>(entries: {
    [I in keyof T]: T[I] extends [
        infer C extends new (...args: any[]) => GameObject,
        ...any
      ]
      ? [C, CreateOptionsOf<C>?]
      : T[I]
  }): T {
    return entries as T;
  }

  game!: Game;
  readonly options: Required<t.WorldOptions>;

  readonly statics = new RTree();
  readonly dynamics = new RTree();

  readonly staticInteracts = new RTree();
  readonly dynamicInteracts = new RTree();

  readonly objects = new GameObjectPool();

  #mounted = false;

  constructor(opts: t.WorldOptions) {
    super();
    this.options = { ...opts };
  }

  mount(game: Game) {
    if (this.#mounted) {
      throw new Error(`${this.constructor.name}.mount: already mounted`);
    }

    this.#mounted = true;
    this.game = game;

    this.onDestroy(
      game.canvas.emitter.on(game.canvas.events.beforeRender, () => {
        this.dynamics.clear();
        this.dynamicInteracts.clear();
      })
    );

    this.nextTick(() => {
      for (const elem of this.options.objects) {
        this.createObject(elem[0], elem[1]);
      }
    });
  }

  override destroy() {
    super.destroy();
    this.objects.destroy();
  }

  createObject(go: t.WorldObject[0], opts?: t.WorldObject[1]): PoolPointer {
    return this.objects.add(go, this.game, opts);
  }

  addToWorld(go: GameObject, world: RTree): void;
  addToWorld(go: GameObject, world: RTree, previous: RTreeEntry | null): RTreeEntry;
  addToWorld(go: GameObject, world: RTree, previous?: RTreeEntry | null): RTreeEntry | void {
    const ptr = go.poolPointer;
    const animation = go.nowPlaying;

    let minX = go.x;
    let minY = go.y;
    let maxX = go.x + go.width || Infinity;
    let maxY = go.y + go.height || Infinity;

    if (animation instanceof LoadedAnimation && animation.collisionBounds != null) {
      const bounds = animation.collisionBounds;
      const scale = animation.scale * go.effects.scale;

      const width = animation.maxWidth * go.effects.scale;
      const height = animation.maxHeight * go.effects.scale;

      const leftInset = bounds.x * scale;
      const rightInset = width - (bounds.x + bounds.width) * scale;

      const topInset = bounds.y * scale;
      const bottomInset = height - (bounds.y + bounds.height) * scale;

      minX += leftInset;
      maxX -= rightInset;
      minY += bottomInset;
      maxY -= topInset;
    }

    if (previous != null) {
      if (
        previous[2] === minX && previous[3] === minY &&
        previous[4] === maxX && previous[5] === maxY
      ) {
        return previous;
      }

      world.remove(...previous);
    }

    world.insert(ptr[0], ptr[1], minX, minY, maxX, maxY);

    if (previous !== undefined) {
      return [ptr[0], ptr[1], minX, minY, maxX, maxY];
    }
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

  findDynamicCollision(minX: number, minY: number, maxX: number, maxY: number): t.Collision | null {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);
    const collision = this.dynamics.searchFirst(x1, y1, x2, y2, pred);

    return collision == null ? null : this.#collisionMapper(collision);
  }

  findBestDynamicCollision(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    score: t.CollisionScore
  ): t.Collision | null {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);
    const collision = this.dynamics.searchBest(x1, y1, x2, y2, (node) => {
      if (!pred(node)) {
        return Infinity;
      }

      const object = this.objects.get(node.pointer[0], node.pointer[1])!;
      return score(node.bbox, object);
    });

    return collision == null ? null : this.#collisionMapper(collision);
  }

  findInteractCollisions(minX: number, minY: number, maxX: number, maxY: number): readonly t.Collision[] {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);

    const dynamicCollisions = this.dynamicInteracts.search(x1, y1, x2, y2, pred);
    const staticCollisions = this.staticInteracts.search(x1, y1, x2, y2, pred);

    if (dynamicCollisions.length === 0 && staticCollisions.length === 0) {
      return cast(dynamicCollisions);
    }

    return dynamicCollisions.concat(staticCollisions).map(this.#collisionMapper);
  }

  findCollisions(minX: number, minY: number, maxX: number, maxY: number): readonly t.Collision[] {
    const x1 = minX - 1, x2 = maxX + 1;
    const y1 = minY - 1, y2 = maxY + 1;

    const pred = this.#getCollisionPredicate(minX, minY, maxX, maxY);

    const dynamicCollisions = this.dynamics.search(x1, y1, x2, y2, pred);
    const staticCollisions = this.statics.search(x1, y1, x2, y2, pred);

    if (dynamicCollisions.length === 0 && staticCollisions.length === 0) {
      return cast(dynamicCollisions);
    }

    return dynamicCollisions.concat(staticCollisions).map(this.#collisionMapper);
  }

  #getCollisionPredicate(minX: number, minY: number, maxX: number, maxY: number): RTreePredicate {
    return ({ bbox, pointer: [kind, i] }) => {
      if (!(maxX > bbox[0] && minX < bbox[2] && maxY > bbox[1] && minY < bbox[3])) {
        return false;
      }

      return this.objects.get(kind, i)?.destroyed === false;
    };
  }

  #collisionMapper = ({ bbox, pointer: [kind, i] }: RTreePublicNode): t.Collision => {
    return { bbox, object: this.objects.get(kind, i)! };
  };
}
