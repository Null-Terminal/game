import { GameObject } from "#engine/game-object/game-object";

export abstract class DynamicObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.dynamic;
  }

  override move(dx: number, dy: number) {
    super.move(dx, dy);
    this.world.addToDynamicWorld(this);
  }
}
