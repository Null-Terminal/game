import { GameObject } from "#engine/game-object/game-object";

export abstract class MotionObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.dynamic;
  }

  move(dx: number, dy: number) {
    this.x = this.x + dx;
    this.y = this.y + dy;
    this.world.addToDynamicWorld(this);
  }
}
