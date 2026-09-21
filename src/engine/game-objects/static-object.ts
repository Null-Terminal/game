import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { GameObject } from "#engine/game-objects/game-object";
import type { GameObjectOptions } from "#engine/game-objects/types";

export abstract class StaticObject<T extends GameObjectOptions = GameObjectOptions> extends GameObject<T> {
  override get redrawEvent() {
    return this.canvas.events.static;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T) {
    const options = super.create(game, poolPointer, opts);
    this.world.addToWorld(this, this.world.statics);
    return options;
  }
}
