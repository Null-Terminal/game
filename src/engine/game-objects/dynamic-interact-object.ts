import { MovableObject } from "#engine/game-objects/movable-object";
import type { GameObjectOptions } from "#engine/game-objects/game-object";

export class DynamicInteractObject<T extends GameObjectOptions = GameObjectOptions> extends MovableObject<T> {
  override get redrawEvent() {
    return this.canvas.events.interact;
  }

  init() {
    this.initPhysics();
  }

  protected override bindFlush() {
    this.world.addToWorld(this, this.world.dynamicInteracts);
  }
}
