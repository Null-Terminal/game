import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { GameObject } from "#engine/game-objects/game-object";
import type { GameObjectOptions } from "#engine/game-objects/types";

export abstract class StaticObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.static;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: GameObjectOptions) {
    super.create(game, poolPointer, opts);
    this.world.addToWorld(this, this.world.statics);
  }
}
