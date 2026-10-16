import { GameObject } from "#engine/game-objects/game-object";

enum State {
  Active,
  Paused,
  Shadowed,
}

export class GameObjectStatus {
  static readonly State = State;

  readonly #go: GameObject;

  #state = State.Active;

  constructor(gameObject: GameObject) {
    this.#go = gameObject;
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

  #set(state: State) {
    if (this.#go.destroyed) {
      throw new Error(`${this.#go.name}.status: called on destroyed object`);
    }

    this.#state = state;
  }
}
