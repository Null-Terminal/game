import { GameObject } from "#engine/game-objects/game-object";

export abstract class DynamicObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.dynamic;
  }

  protected override bindFlush() {
    this.world.addToWorld(this, this.world.dynamics);
  }
}
