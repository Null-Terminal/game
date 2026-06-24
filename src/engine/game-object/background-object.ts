import { GameObject } from "#engine/game-object/game-object";

export abstract class BackgroundObject extends GameObject {
  override get redrawEvent() {
    return this.canvas.events.background;
  }
}
