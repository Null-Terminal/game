import { ColliderObject } from "#engine/game-objects/collider-object";
import type { GameObjectOptions } from "#engine/game-objects/game-object";

export class InteractObject<T extends GameObjectOptions = GameObjectOptions> extends ColliderObject<T> {
  override init() {
    this.collision.toInteract();
  }

  override get redrawEvent() {
    return this.canvas.events.interact;
  }
}
