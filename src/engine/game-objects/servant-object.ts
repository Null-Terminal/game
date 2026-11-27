import { Destroyable } from "#lib/destroyable";
import type { GameObject } from "#engine/game-objects/game-object";

export abstract class ServantObject<T extends GameObject = GameObject> extends Destroyable {
  readonly go: T;

  protected constructor(go: T) {
    super();
    this.go = go;
  }
}
