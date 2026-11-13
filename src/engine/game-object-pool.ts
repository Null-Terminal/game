import type { CreateParameters, GameObject } from "#engine/game-objects";
import type * as t from "#engine/game-object-pool/types";

export type * from "#engine/game-object-pool/types";

export class GameObjectPool {
  readonly objects: Record<number, t.GameObjectStore> = {};

  has(kind: number, index: number) {
    const store = this.objects[kind];
    return store != null && index < store.length;
  }

  get(kind: number, index: number): GameObject | undefined {
    if (!this.has(kind, index)) {
      return undefined;
    }

    return this.objects[kind]!.buffer[index];
  }

  add<T extends typeof GameObject, A extends CreateParameters<T>>(
    GObject: t.KindedGameObjectCtor<T>,
    game: A[0],
    opts: A[2]
  ): t.PoolPointer {
    const kind = GObject.kind;

    const init = kind in this.objects;
    const store = init ? this.objects[kind]! : { length: 0, buffer: [] };

    if (!init) {
      this.objects[kind] = store;
    }

    const { length, buffer } = store;
    const poolPointer: t.PoolPointer = [kind, length];

    const fromPool = buffer.length > length;
    const object = fromPool ? buffer[length]! : new GObject();

    store.length++;

    try {
      object.create(game, poolPointer, opts);

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

  destroy() {
    for (const [kind, store] of Object.entries(this.objects)) {
      while (store.length > 0) {
        this.delete(Number(kind), store.length - 1);
      }

      store.buffer.length = 0;
    }
  }
}
