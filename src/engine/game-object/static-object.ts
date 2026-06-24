import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { GameObject } from "#engine/game-object/game-object";
import type { GameObjectOptions } from "#engine/game-object/types";

export abstract class StaticObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.static;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: GameObjectOptions) {
    super.create(game, poolPointer, opts);
    this.world.addToStaticWorld(this);
  }
}
