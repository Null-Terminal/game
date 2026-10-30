import type { GameObject } from "#engine/game-objects/game-object";

export abstract class GameObjectServant<T extends GameObject = GameObject> {
  readonly go: T;

  protected constructor(go: T) {
    this.go = go;
  }
}
