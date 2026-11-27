import { EventEmitter, handler } from "#lib/event-emitter";

import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";

export class GameObjectStatus extends ServantObject {
  readonly emitter = new EventEmitter({
    sleepChange: handler<boolean>()
  });

  readonly events = this.emitter.events;

  #sleeping = false;

  constructor(go: GameObject) {
    super(go);
  }

  get sleeping() {
    return this.#sleeping;
  }

  sleep() {
    this.#setSleeping(true);
  }

  wake() {
    this.#setSleeping(false);
  }

  reset() {
    this.#sleeping = false;
  }

  @ifAlive
  #setSleeping(sleeping: boolean) {
    if (this.#sleeping === sleeping) {
      return;
    }

    this.#sleeping = sleeping;
    this.events.sleepChange.emit(sleeping);
  }
}
