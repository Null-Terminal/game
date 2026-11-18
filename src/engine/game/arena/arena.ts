import type { World, WorldObject } from "#engine/game/world";

import type { GameObject } from "#engine/game-objects";
import type { PoolPointer } from "#engine/game-object-pool";

import type { ArenaDefinition, ArenaRef, ArenaSnapshot, ArenaSource } from "#engine/game/arena/types";

enum State {
  // Объекты арены находятся в мире
  Loaded,

  // Объекты выгружены, снимок можно восстановить
  Unloaded,

  // Снимок удалён, экземпляр арены больше не используется
  Destroyed,
}

export class Arena {
  static readonly State = State;

  static ref<T extends ArenaSource>(source: T, name?: string): ArenaRef<T> {
    return name == null ? { source } : { source, name };
  }

  readonly world: World;

  autoUnload = true;
  readonly definition: ArenaDefinition;

  get state() {
    return this.#state;
  }

  get loaded() {
    return this.#state === State.Loaded;
  }

  get unloaded() {
    return this.#state === State.Unloaded;
  }

  get destroyed() {
    return this.#state === State.Destroyed;
  }

  get size() {
    return this.#objects.size;
  }

  readonly #objects = new Set<GameObject>();
  readonly #stateSlots = new Map<string, GameObject | null>();
  readonly #stateKeyByObject = new WeakMap<GameObject, string>();
  readonly #creatingPaths: (string | null)[] = [];

  #state = State.Unloaded;
  #snapshot: ArenaSnapshot;

  constructor(world: World, definition: ArenaDefinition, snapshot: ArenaSnapshot = { version: 1, objects: {} }) {
    if (snapshot.version !== 1) {
      throw new RangeError(`${this.constructor.name}: unsupported snapshot version`);
    }

    this.world = world;
    this.definition = definition;
    this.#snapshot = structuredClone(snapshot);
  }

  isFarFromViewport(distanceScreens: number): boolean {
    for (const go of this.#objects) {
      if (!go.isFarFromViewport(distanceScreens)) {
        return false;
      }
    }

    return true;
  }

  createObject(go: WorldObject[0], opts?: WorldObject[1]): PoolPointer | null {
    // У созданного вручную объекта нет позиционного ключа; для снапшота нужен stateKey
    return this.#createObject(go, opts, null);
  }

  createChildObject(name: string, go: WorldObject[0], opts?: WorldObject[1]): PoolPointer | null {
    const parentPath = this.#creatingPaths.at(-1);
    const path = parentPath == null ? null : `${parentPath}/${encodeURIComponent(name)}`;
    return this.#createObject(go, opts, path);
  }

  release(go: GameObject) {
    this.#objects.delete(go);

    const key = this.#stateKeyByObject.get(go);

    if (key != null && this.loaded) {
      this.#stateSlots.set(key, null);
    }

    this.#stateKeyByObject.delete(go);
  }

  restore() {
    if (!this.unloaded || this.world.destroyed) {
      throw new Error(`${this.constructor.name}.restore: arena is not unloaded`);
    }

    this.#state = State.Loaded;
    this.autoUnload = this.definition.autoUnload ?? true;

    try {
      for (const [index, [go, opts]] of this.definition.objects.entries()) {
        this.#createObject(go, opts, `root:${index}`);
      }

    } catch (err) {
      this.#state = State.Unloaded;

      try {
        this.#destroyObjects();

      } catch (cleanupError) {
        throw new AggregateError([err, cleanupError], `${this.constructor.name}.restore: rollback failed`, { cause: cleanupError });

      } finally {
        this.#stateSlots.clear();
      }

      throw err;
    }
  }

  serialize(): ArenaSnapshot {
    if (this.destroyed) {
      throw new Error(`${this.constructor.name}.serialize: arena is destroyed`);
    }

    if (this.unloaded) {
      return structuredClone(this.#snapshot);
    }

    const objects: ArenaSnapshot["objects"] = structuredClone(this.#snapshot.objects);

    for (const [key, go] of this.#stateSlots) {
      objects[key] = go == null || go.destroyed ?
        { destroyed: true } :
        { destroyed: false, state: go.state.save() };
    }

    return { version: 1, objects };
  }

  unload() {
    if (!this.loaded) {
      return;
    }

    this.#snapshot = this.serialize();
    this.#state = State.Unloaded;

    try {
      this.#destroyObjects();

    } finally {
      this.#stateSlots.clear();
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.#state = State.Destroyed;
    this.#snapshot = { version: 1, objects: {} };

    try {
      this.#destroyObjects();

    } finally {
      this.#stateSlots.clear();
    }
  }

  #createObject(go: WorldObject[0], opts: WorldObject[1] | undefined, path: string | null): PoolPointer | null {
    if (!this.loaded || this.world.destroyed) {
      throw new Error(`${this.constructor.name}.createObject: arena is not loaded`);
    }

    const key = opts?.stateKey == null ? path : `key:${opts.stateKey}`;

    if (key != null) {
      if (opts?.stateKey === "" || this.#stateSlots.has(key)) {
        throw new Error(`${this.constructor.name}.createObject: invalid or duplicate state key "${key}"`);
      }

      this.#stateSlots.set(key, null);

      if (this.#snapshot.objects[key]?.destroyed) {
        return null;
      }
    }

    const saved = key == null ? undefined : this.#snapshot.objects[key];
    const snapshot = saved != null && !saved.destroyed ? saved.state : undefined;

    this.#creatingPaths.push(key);

    try {
      const pointer = this.world.objects.add(go, this.world.game, opts, this, snapshot);
      const object = this.world.objects.get(...pointer)!;

      this.#objects.add(object);

      if (key != null) {
        this.#stateSlots.set(key, object);
        this.#stateKeyByObject.set(object, key);
      }

      return pointer;

    } catch (err) {
      if (key != null) {
        this.#stateSlots.delete(key);
      }

      throw err;

    } finally {
      this.#creatingPaths.pop();
    }
  }

  #destroyObjects() {
    const errors: unknown[] = [];
    const objects = [...this.#objects].reverse();

    for (const go of objects) {
      this.#objects.delete(go);

      try {
        go.destroy();

      } catch (err) {
        errors.push(err);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, `${this.constructor.name}: objects failed to destroy`);
    }
  }
}
