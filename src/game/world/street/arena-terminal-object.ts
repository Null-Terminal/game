import { World, type Arena, type ArenaDefinition } from "#engine/game";
import type { GameObject } from "#engine/game-objects";

import { barrel } from "#game/sprites/platforms/barrel";
import { scaffoldPlank } from "#game/sprites/platforms/scaffold-plank";

import { ControlObject } from "#game/control-object";
import { PlatformObject } from "#game/platforms/platform-object";
import { PickupObject } from "#game/pickup-object";

function createTerminalArena(): ArenaDefinition {
  return {
    objects: World.of([
      [PlatformObject, { show: barrel, x: 4890, y: 233 }],
      [PlatformObject, { show: barrel, x: 4970, y: 233 }],
      [PlatformObject, { show: scaffoldPlank.intact, x: 4910, y: 390 }],
      [PickupObject, { kind: "fuel", x: 5120, y: 270 }]
    ])
  };
}

export class ArenaTerminalObject extends ControlObject {
  #arena: Arena | null = null;
  #pending = Promise.resolve();
  #generation = 0;

  override visit(go: GameObject) {
    const wasActive = this.active;
    super.visit(go);

    if (this.active !== wasActive) {
      this.#queueSync();
    }
  }

  override destroy() {
    if (this.destroyed) {
      return;
    }

    const arena = this.#arena;
    this.#arena = null;
    this.#generation++;

    try {
      super.destroy();

    } finally {
      if (arena != null && !arena.world.destroyed) {
        this.#pending = this.#pending
          .then(() => arena.world.arenas.destroyArena(arena))
          .catch((err: unknown) => console.error(`${this.constructor.name}: arena destroy failed`, err));
      }
    }
  }

  #queueSync() {
    const world = this.world;
    const generation = this.#generation;

    this.#pending = this.#pending.then(() => {
      if (generation !== this.#generation) {
        return;
      }

      return this.#syncArena(world, generation);
    }).catch((err: unknown) => {
      if (generation === this.#generation && !this.destroyed && !world.destroyed) {
        console.error(`${this.constructor.name}: arena transition failed`, err);
      }
    });
  }

  async #syncArena(world: World, generation: number) {
    if (world.destroyed) {
      return;
    }

    if (this.destroyed || !this.active) {
      if (this.#arena?.loaded) {
        await world.arenas.unloadArena(this.#arena);
      }

      return;
    }

    if (this.#arena != null) {
      if (this.#arena.unloaded) {
        await world.arenas.restoreArena(this.#arena);
      }

      return;
    }

    const arena = await world.arenas.loadArena(createTerminalArena);

    if (generation !== this.#generation || this.destroyed || !this.active) {
      if (generation !== this.#generation || this.destroyed) {
        await world.arenas.destroyArena(arena);

      } else {
        this.#arena = arena;
        await world.arenas.unloadArena(arena);
      }

    } else {
      this.#arena = arena;
    }
  }
}
