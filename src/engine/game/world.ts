import { RTree } from "#engine/rtree";
import { GameObjectPool } from "#engine/game-object-pool";

import type { Game } from "#engine/game";
import type { GameObject } from "#engine/game-object";

import type { WorldOptions } from "#engine/game/world/types";

export * from "#engine/game/world/types";

export class World {
  readonly game: Game;
  readonly options: Required<WorldOptions>;

  #staticWorld = new RTree();
  #objectPool = new GameObjectPool();

  constructor(game: Game, opts: WorldOptions) {
    this.game = game;

    this.options = {
      ...opts
    };

    for (const elem of opts.staticWorld) {
      const opts = elem.object[1];

      if (opts.effects?.scale != null) {
        const { scale } = opts.effects;

        for (let i = 0; i < elem.bbox.length; i++) {
          elem.bbox[i]! *= scale;
        }
      }

      const ptr = this.#objectPool.add(elem.object[0], game, {
        bbox: elem.bbox,
        ...elem.object[1]
       });

      this.#staticWorld.insert(...ptr, ...elem.bbox);
    }
  }

  hasCollision(minX: number, minY: number, maxX: number, maxY: number): boolean {
    return this.#staticWorld.searchFirst(minX - 1, minY - 1, maxX + 1, maxY + 1, ({ bbox }) => {
      const [rx, ry, rw, rh] = bbox;
      return maxX > rx && minX < rw && maxY > ry && minY < rh;
    }) != null;
  }

  findCollisions(minX: number, minY: number, maxX: number, maxY: number): GameObject[] {
    const collisions = this.#staticWorld.search(minX - 1, minY - 1, maxX + 1, maxY + 1, ({ bbox }) => {
      const [rx, ry, rw, rh] = bbox;
      return maxX > rx && minX < rw && maxY > ry && minY < rh;
    });

    return collisions.map(({ pointer: [kind, i] }) => this.#objectPool.get(kind, i)!)!;
  }
}
