import { Destroyable } from "#lib/destroyable";
import type { CreateParameters, GameObject, StateValue } from "#engine/game-objects";

import { Arena } from "#engine/game/arena";
import type { World } from "#engine/game/world";

import type * as t from "#engine/game-object-pool/types";

export type * from "#engine/game-object-pool/types";

export class GameObjectPool extends Destroyable {
  readonly objects: Record<number, t.GameObjectStore> = {};
  readonly world: World;

  constructor(world: World) {
    super();
    this.world = world;

    this.onDestroy(() => {
      for (const [kind, store] of Object.entries(this.objects)) {
        while (store.length > 0) {
          this.delete(Number(kind), store.length - 1);
        }

        store.buffer.length = 0;
      }
    });
  }

  has(kind: number, index: number) {
    const store = this.objects[kind];
    return store != null && index < store.length;
  }

  get(kind: number, index: number): GameObject | undefined {
    const store = this.objects[kind];
    return store != null && index < store.length ? store.buffer[index] : undefined;
  }

  add<T extends typeof GameObject, A extends CreateParameters<T>>(
    GObject: t.KindedGameObjectCtor<T>,
    game: A[0],
    opts: A[2],
    snapshot?: StateValue
  ): t.PoolPointer;

  add<T extends typeof GameObject, A extends CreateParameters<T>>(
    GObject: t.KindedGameObjectCtor<T>,
    game: A[0],
    opts: A[2],
    arena: Arena,
    snapshot?: StateValue
  ): t.PoolPointer;

  add<T extends typeof GameObject, A extends CreateParameters<T>>(
    GObject: t.KindedGameObjectCtor<T>,
    game: A[0],
    opts: A[2],
    arenaOrSnapshot?: Arena | StateValue,
    snapshot?: StateValue
  ): t.PoolPointer {
    const hasArena = arenaOrSnapshot instanceof Arena;
    const arena = hasArena ? arenaOrSnapshot : null;

    const state = hasArena ? snapshot : arenaOrSnapshot;
    const { kind } = GObject;

    const init = kind in this.objects;
    const store = init ? this.objects[kind]! : { length: 0, buffer: [] };

    if (!init) {
      this.objects[kind] = store;
    }

    const { length, buffer } = store;
    const poolPointer: t.PoolPointer = [kind, length];

    const fromPool = buffer.length > length;
    const object = fromPool ? buffer[length]! : new GObject();

    object.world = this.world;
    object.arena = arena;
    store.length++;

    try {
      object.create(game, poolPointer, opts, state);

      if (!fromPool) {
        buffer.push(object);
      }

      return poolPointer;

    } catch (err) {
      try {
        if (!object.destroyed) {
          object.destroy();
        }

      } finally {
        store.length = length;
      }

      throw err;
    }
  }

  delete(kind: number, index: number) {
    const removed = this.get(kind, index);

    if (removed == null) {
      return;
    }

    try {
      removed.destroy();

    } finally {
      if (removed.destroyed) {
        this.release(removed);
      }
    }
  }

  release(go: GameObject) {
    const [kind, index] = go.poolPointer;
    const store = this.objects[kind];

    if (store == null || index >= store.length || store.buffer[index] !== go) {
      return;
    }

    const last = store.length - 1;

    if (index < last) {
      const moved = store.buffer[last]!;

      store.buffer[index] = moved;
      store.buffer[last] = go;

      moved.reindex(index);
      go.poolPointer = [kind, last];
    }

    store.length = last;
  }
}
