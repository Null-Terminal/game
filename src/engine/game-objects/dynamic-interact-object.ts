import { MovableObject } from "#engine/game-objects/movable-object";

export abstract class DynamicInteractObject extends MovableObject {
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
