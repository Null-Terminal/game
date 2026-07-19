import { GameObject } from "#engine/game-objects/game-object";

export abstract class DynamicObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.dynamic;
  }

  override move(dx: number, dy: number) {
    super.move(dx, dy);
    this.world.addToWorld(this, this.world.dynamics);
  }
}
