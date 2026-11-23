import { Arena } from "#engine/game/arena/arena";
import { isPositive } from "#/utils/validators";

import type { World } from "#engine/game/world";
import type { BaseGameSettings } from "#engine/game";
import type { Subscription } from "#lib/event-emitter";

import type * as t from "#engine/game/arena/types";

type PendingCommit = {
  run(): void;
  reject(reason?: unknown): void;
};

export class Arenas<T extends Record<string, t.ArenaSource> = Record<string, t.ArenaSource>> implements Iterable<Arena> {
  static declare<const T extends Record<string, t.ArenaSource>>(
    sources: T,
    opts?: t.ArenasOptions
  ): t.ArenasDeclaration<T> {
    const refs = Object.fromEntries(Object.entries(sources).map(([name, source]) => [
      name,
      Arena.ref(source, name)
    ])) as t.ArenaRefs<T>;

    const refsToPreload = new Set<t.ArenaRef>();

    if (opts?.unload != null) {
      const { checkInterval } = opts.unload;

      if (checkInterval != null && !isPositive(checkInterval)) {
        throw new RangeError(`${this.name}.declare: expected positive interval`);
      }
    }

    return {
      refs,

      preload(...selected) {
        for (const ref of selected) {
          refsToPreload.add(ref);
        }

        return this;
      },

      create(world) {
        return new Arenas(world, refs, refsToPreload, opts);
      }
    };
  }

  readonly refs: t.ArenaRefs<T>;
  readonly options: t.ResolvedArenasOptions;

  get size() {
    return this.#arenas.values()
      .filter((arena) => arena.loaded)
      .reduce((count) => count + 1, 0);
  }

  readonly #world: World;

  readonly #settingsSubscription: Subscription;
  #unloadSettings: BaseGameSettings["arenaUnload"];

  readonly #refsToPreload: Set<t.ArenaRef>;
  readonly #arenas = new Set<Arena>();

  readonly #byRef = new Map<t.ArenaRef, Arena>();
  readonly #loadingByRef = new Map<t.ArenaRef, Promise<Arena>>();
  readonly #pendingByArena = new Map<Arena, Promise<unknown>>();

  readonly #pendingCommits: PendingCommit[] = [];
  readonly #scheduledUnloads = new Set<Arena>();

  #fallbackFrame = 0;
  #lastAutoUnloadCheckAt = performance.now();

  protected constructor(
    world: World,
    refs: t.ArenaRefs<T>,
    refsToPreload: Set<t.ArenaRef>,
    opts?: t.ArenasOptions
  ) {
    this.refs = refs;

    this.options = {
      unload: { checkInterval: opts?.unload?.checkInterval ?? 500 }
    };

    this.#world = world;
    this.#refsToPreload = new Set(refsToPreload);
    this.#unloadSettings = world.game.settings.get("arenaUnload");
    this.#settingsSubscription = world.game.settings.events.change.on((key) => {
      if (key === "arenaUnload") {
        this.#unloadSettings = world.game.settings.get("arenaUnload");
      }
    });
  }

  [Symbol.iterator](): IterableIterator<Arena> {
    return this.#arenas.values().filter((arena) => arena.loaded);
  }

  flush() {
    const pending = this.#pendingCommits.splice(0);

    for (const commit of pending) {
      commit.run();
    }
  }

  getByRef(ref: t.ArenaRef): Arena | undefined {
    return this.#byRef.get(ref);
  }

  async preload(): Promise<void> {
    for (const ref of this.#refsToPreload) {
      await this.loadArena(ref);
    }
  }

  async loadArena(input: t.ArenaRef | t.ArenaSource, snapshot?: t.ArenaSnapshot): Promise<Arena> {
    if (typeof input !== "function") {
      const pending = this.#loadingByRef.get(input);

      if (pending != null) {
        return pending;
      }

      const loading = this.#loadByRef(input, snapshot);
      this.#loadingByRef.set(input, loading);

      try {
        const arena = await loading;
        this.#byRef.set(input, arena);
        return arena;

      } finally {
        this.#loadingByRef.delete(input);
      }
    }

    return this.#loadNewArena(input, snapshot);
  }

  unloadArena(arena: Arena): Promise<void> {
    this.#assertKnownArena(arena);
    return this.#commitArena(arena, () => this.#unloadArena(arena));
  }

  restoreArena(arena: Arena): Promise<Arena> {
    this.#assertKnownArena(arena);

    if (!arena.unloaded) {
      throw new Error(`${this.constructor.name}.restoreArena: arena is not unloaded`);
    }

    return this.#commitArena(arena, () => {
      arena.restore();
      return arena;
    });
  }

  destroyArena(arena: Arena): Promise<void> {
    this.#assertKnownArena(arena);

    return this.#commitArena(arena, () => {
      this.#arenas.delete(arena);

      for (const [ref, current] of this.#byRef) {
        if (current === arena) {
          this.#byRef.delete(ref);
          break;
        }
      }

      arena.destroy();
    });
  }

  checkAutoUnload(now: number) {
    const unload = this.#unloadSettings;

    if (unload == null) {
      return;
    }

    const { distanceScreens } = unload;

    if (now - this.#lastAutoUnloadCheckAt < this.options.unload.checkInterval) {
      return;
    }

    this.#lastAutoUnloadCheckAt = now;

    for (const arena of this) {
      const shouldIgnore =
        !arena.autoUnload ||
        this.#scheduledUnloads.has(arena) ||
        !arena.isFarFromViewport(distanceScreens);

      if (shouldIgnore) {
        continue;
      }

      this.#scheduledUnloads.add(arena);

      void this.#commitArena(arena, () => {
        const currentDistance = this.#unloadSettings?.distanceScreens;

        if (arena.loaded && currentDistance != null && arena.isFarFromViewport(currentDistance)) {
          this.#unloadArena(arena);
        }
      })
        .catch((err) => console.error(`${this.constructor.name}: automatic unload failed`, err))
        .finally(() => this.#scheduledUnloads.delete(arena));
    }
  }

  destroy() {
    this.#settingsSubscription.dispose();
    cancelAnimationFrame(this.#fallbackFrame);

    const error = new Error(`${this.constructor.name}: world was destroyed`);

    for (const commit of this.#pendingCommits.splice(0)) {
      commit.reject(error);
    }

    const errors: unknown[] = [];

    for (const arena of this.#arenas) {
      try {
        arena.destroy();

      } catch (err) {
        errors.push(err);
      }
    }

    this.#byRef.clear();
    this.#arenas.clear();
    this.#loadingByRef.clear();
    this.#pendingByArena.clear();
    this.#scheduledUnloads.clear();

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, `${this.constructor.name}.destroy: arenas failed to unload`);
    }
  }

  async #loadByRef(ref: t.ArenaRef, snapshot?: t.ArenaSnapshot): Promise<Arena> {
    const current = this.#byRef.get(ref);
    const pendingChange = current == null ? undefined : this.#pendingByArena.get(current);

    if (pendingChange != null) {
      await Promise.allSettled([pendingChange]);
    }

    const arena = this.#byRef.get(ref);

    if (arena?.loaded) {
      return arena;
    }

    return arena?.unloaded ? this.restoreArena(arena) : this.#loadNewArena(ref.source, snapshot);
  }

  async #loadNewArena(source: t.ArenaSource, snapshot?: t.ArenaSnapshot): Promise<Arena> {
    const world = this.#world;

    if (world.destroyed || world.game == null) {
      throw new Error(`${this.constructor.name}.loadArena: world is not active`);
    }

    const definition = await source(world.abortSignal);

    if (world.destroyed) {
      throw new Error(`${this.constructor.name}.loadArena: world was destroyed during loading`);
    }

    return this.#commit(() => {
      const arena = new Arena(world, definition, snapshot);

      try {
        arena.restore();

      } catch (err) {
        try {
          arena.destroy();

        } catch (cleanupError) {
          throw new AggregateError([err, cleanupError], `${this.constructor.name}.loadArena: rollback failed`, { cause: cleanupError });
        }

        throw err;
      }

      this.#arenas.add(arena);
      return arena;
    });
  }

  #commitArena<T>(arena: Arena, action: () => T): Promise<T> {
    const result = this.#commit(action);
    this.#pendingByArena.set(arena, result);

    void Promise.allSettled([result]).then(() => {
      if (this.#pendingByArena.get(arena) === result) {
        this.#pendingByArena.delete(arena);
      }
    });

    return result;
  }

  #commit<T>(action: () => T): Promise<T> {
    const world = this.#world;

    const runAction = () => {
      if (world.destroyed) {
        throw new Error(`${this.constructor.name}: world is destroyed`);
      }

      return action();
    };

    if (world.destroyed) {
      return Promise.reject(new Error(`${this.constructor.name}: world is destroyed`));
    }

    if (world.game.canvas.paused || !world.game.canvas.running) {
      return Promise.resolve().then(runAction);
    }

    const deferred = Promise.withResolvers<T>();

    this.#pendingCommits.push({
      run: () => {
        void Promise.try(runAction).then(deferred.resolve, deferred.reject);
      },

      reject: deferred.reject
    });

    if (this.#fallbackFrame === 0) {
      this.#fallbackFrame = requestAnimationFrame(() => {
        this.#fallbackFrame = 0;

        if (world.game.canvas.paused || !world.game.canvas.running) {
          this.flush();
        }
      });
    }

    return deferred.promise;
  }

  #assertKnownArena(arena: Arena) {
    if (!this.#arenas.has(arena)) {
      throw new Error(`${this.constructor.name}: arena does not belong to this world`);
    }
  }

  #unloadArena(arena: Arena) {
    if (!arena.loaded) {
      return;
    }

    arena.unload();
  }
}
