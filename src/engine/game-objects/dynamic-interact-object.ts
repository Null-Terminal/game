import { ifAlive } from "#engine/game-objects/decorators";
import { MovableObject } from "#engine/game-objects/movable-object";

export abstract class DynamicInteractObject extends MovableObject {
  override get redrawEvent() {
    return this.canvas.events.interact;
  }

  init() {
    this.initPhysics();
  }

  @ifAlive
  override move(dx: number, dy: number): number {
    const moveStatus = super.move(dx, dy);

    if (!this.destroyed) {
      this.world.addToWorld(this, this.world.dynamicInteracts);
    }

    return moveStatus;
  }
}
