import { EventEmitter, handler } from "#/event-emitter";
import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";

enum State {
  Active,
  Paused,
}

export class GameObjectStatus extends ServantObject {
  static readonly State = State;

  readonly emitter = new EventEmitter({ sleepChange: handler<boolean>() });
  readonly events = this.emitter.events;

  #state = State.Active;
  #sleeping = false;

  constructor(go: GameObject) {
    super(go);
  }

  get active() {
    return this.#state === State.Active && !this.#sleeping;
  }

  get paused() {
    return this.#state === State.Paused;
  }

  get sleeping() {
    return this.#sleeping;
  }

  pause() {
    this.#set(State.Paused);
  }

  resume() {
    if (this.paused) {
      this.#set(State.Active);
    }
  }

  togglePause() {
    this.#set(this.paused ? State.Active : State.Paused);
  }

  sleep() {
    this.#setSleeping(true);
  }

  wake() {
    this.#setSleeping(false);
  }

  reset() {
    this.#state = State.Active;
    this.#sleeping = false;
  }

  @ifAlive
  #set(state: State) {
    this.#state = state;
  }

  @ifAlive
  #setSleeping(sleeping: boolean) {
    if (this.#sleeping === sleeping) {
      return;
    }

    this.#sleeping = sleeping;
    this.emitter.emit(this.events.sleepChange, sleeping);
  }
}
