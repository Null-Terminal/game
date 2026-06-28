import type { GameObject } from "#engine/game-objects";
import type { GameObjectStore, ConcreteGameObjectConstructor, PoolPointer } from "#engine/game-object-pool/types";

export type * from "#engine/game-object-pool/types";

export class GameObjectPool {
  readonly objects: Record<number, GameObjectStore> = {};

  has(kind: number, index: number) {
    const store = this.objects[kind];
    return store != null && index < store.length;
  }

  get(kind: number, index: number): GameObject | undefined {
    const store = this.objects[kind];
    return store?.buffer[index];
  }

  add<T extends typeof GameObject, A extends ConstructorParameters<T>>(
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

    if (buffer.length > length) {
      buffer[length]!.create(game, poolPointer, opts);

    } else {
      buffer.push(new GObject(game, poolPointer, opts));
    }

    return poolPointer;
  }

  delete(kind: number, index: number) {
    const store = this.objects[kind];

    if (store != null) {
      if (index < store.length - 1) {
        store.buffer[index] = store.buffer[store.length - 1]!;
      }

      store.length--;
    }
  }
}
