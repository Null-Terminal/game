import { MovableObject } from "#engine/game-objects/movable-object";

export abstract class InteractObject extends MovableObject {
  override get redrawEvent() {
    return this.canvas.events.interact;
  }

  init() {
    this.initPhysics();
  }

  override move(dx: number, dy: number): number {
    const moveStatus = super.move(dx, dy);
    this.world.addToWorld(this, this.world.interacts);
    return moveStatus;
  }
}
