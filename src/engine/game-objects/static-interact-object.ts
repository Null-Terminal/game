import { StaticObject } from "#engine/game-objects/static-object";
import type { GameObjectOptions } from "#engine/game-objects/types";

export abstract class StaticInteractObject<T extends GameObjectOptions = GameObjectOptions> extends StaticObject<T> {
  override get redrawEvent() {
    return this.canvas.events.interact;
  }

  protected override get collisionTree() {
    return this.world.staticInteracts;
  }
}
