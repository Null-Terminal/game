import type { GameObject } from "#engine/game-object";
import type { GameObjectStore, PoolPointer } from "#engine/game-object-pool/types";

export type * from "#engine/game-object-pool/types";

type ConcreteGameObjectConstructor<T extends typeof GameObject> = {
  new (...args: any[]): InstanceType<T>;
  get kind(): number;
};

export class GameObjectPool {
  readonly objects: Record<number, GameObjectStore> = {};

  has(kind: number, index: number) {
    const store = this.objects[kind];
    return store != null && index < store.length;
  }

  add<T extends typeof GameObject, A extends ConstructorParameters<T>>(
    GameObject: ConcreteGameObjectConstructor<T>,
    game: A[0],
    opts: A[1]
  ): PoolPointer {
    const kind = GameObject.kind;

    const init = kind in this.objects;
    const store = init ? this.objects[kind]! : { length: 0, buffer: [] };

    if (!init) {
      this.objects[kind] = store;
    }

    const { length, buffer } = store;

    if (buffer.length > length) {
      buffer[length]!.create(game, opts);

    } else {
      buffer.push(new GameObject(game, opts));
    }

    return [kind, store.length++];
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
