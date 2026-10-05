import { ifAlive } from "#engine/game-objects/decorators";
import { GameObject } from "#engine/game-objects/game-object";

export abstract class DynamicObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.dynamic;
  }

  @ifAlive
  override move(dx: number, dy: number) {
    super.move(dx, dy);

    if (!this.destroyed) {
      this.world.addToWorld(this, this.world.dynamics);
    }
  }
}
