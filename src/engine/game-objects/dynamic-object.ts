import { GameObject } from "#engine/game-objects/game-object";
import type { GameObjectOptions } from "#engine/game-objects/game-object";

export class DynamicObject<T extends GameObjectOptions = GameObjectOptions> extends GameObject<T> {
  init() {}

  override get redrawEvent() {
    return this.canvas.events.dynamic;
  }

  protected override bindFlush() {
    this.world.addToWorld(this, this.world.dynamics);
  }
}
