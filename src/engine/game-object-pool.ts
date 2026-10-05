import type { CreateParameters, GameObject } from "#engine/game-objects";
import type { GameObjectStore, ConcreteGameObjectConstructor, PoolPointer } from "#engine/game-object-pool/types";

export type * from "#engine/game-object-pool/types";

export class GameObjectPool {
  readonly objects: Record<number, GameObjectStore> = {};

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
    GObject: ConcreteGameObjectConstructor<T>,
    game: A[0],
    opts: A[2]
  ): PoolPointer {
    const kind = GObject.kind;

    const init = kind in this.objects;
    const store = init ? this.objects[kind]! : { length: 0, buffer: [] };

    if (!init) {
      this.objects[kind] = store;
    }

    const { length, buffer } = store;

    const poolPointer: PoolPointer = [kind, store.length++];
    const fromPool = buffer.length > length;

    const object = fromPool ? buffer[length]! : new GObject();
    object.create(game, poolPointer, opts);

    if (!fromPool) {
      buffer.push(object);
    }

    return poolPointer;
  }

  delete(kind: number, index: number) {
    if (!this.has(kind, index)) {
      return;
    }

    const store = this.objects[kind]!;
    const removed = store.buffer[index]!;

    removed.destroy();

    const [, removedIndex] = removed.poolPointer;

    if (removedIndex >= store.length || store.buffer[removedIndex] !== removed) {
      return;
    }

    const last = store.length - 1;

    if (removedIndex < last) {
      const moved = store.buffer[last]!;

      store.buffer[removedIndex] = moved;
      store.buffer[last] = removed;

      moved.reindex(removedIndex);
      removed.poolPointer = [kind, last];
    }

    store.length = last;
  }

  destroy() {
    for (const store of Object.values(this.objects)) {
      for (let i = store.length; i--;) {
        store.buffer[i]!.destroy();
      }

      store.length = 0;
      store.buffer.length = 0;
    }
  }
}
