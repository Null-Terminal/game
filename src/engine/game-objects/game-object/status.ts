import { ifAlive } from "#engine/game-objects/decorators";
import { GameObjectServant } from "#engine/game-objects/servant";

import type { GameObject } from "#engine/game-objects/game-object";

enum State {
  Active,
  Paused,
  Shadowed,
}

export class GameObjectStatus extends GameObjectServant {
  static readonly State = State;

  #state = State.Active;

  constructor(go: GameObject) {
    super(go);
  }

  get active() {
    return this.#state === State.Active;
  }

  get paused() {
    return this.#state === State.Paused;
  }

  get shadowed() {
    return this.#state === State.Shadowed;
  }

  pause() {
    this.#set(State.Paused);
  }

  resume() {
    if (this.paused) {
      this.#set(State.Active);
    }
  }

  shadow() {
    this.#set(State.Shadowed);
  }

  unshadow() {
    if (this.shadowed) {
      this.#set(State.Active);
    }
  }

  togglePause() {
    this.#set(this.paused ? State.Active : State.Paused);
  }

  toggleShadow() {
    this.#set(this.shadowed ? State.Active : State.Shadowed);
  }

  reset() {
    this.#state = State.Active;
  }

  @ifAlive
  #set(state: State) {
    this.#state = state;
  }
}
