import { GameObject } from "#engine/game-objects/game-object";

enum State {
  Active,
  Paused,
  Shadowed,
}

export class GameObjectStatus {
  static readonly State = State;

  readonly #go: GameObject;

  constructor(gameObject: GameObject) {
    this.#go = gameObject;
  }

  get active() {
    return this.#go.statusValue === State.Active;
  }

  get paused() {
    return this.#go.statusValue === State.Paused;
  }

  get shadowed() {
    return this.#go.statusValue === State.Shadowed;
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
    this.#go.statusValue = State.Active;
  }

  #set(state: State) {
    if (this.#go.destroyed) {
      throw new Error(`${this.#go.name}.status: called on destroyed object`);
    }

    this.#go.statusValue = state;
  }
}
