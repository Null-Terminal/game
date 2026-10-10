import type { MovableObject } from "#engine/game-objects/movable-object";

enum State {
  // Объект не взаимодействует со внешним миром, движение без коллизий
  Kinematic,

  // Объект взаимодействует со внешним миром, движение с учетом коллизий
  Solid,
}

export class MovableObjectMotion {
  static readonly State = State;

  readonly #go: MovableObject;

  constructor(gameObject: MovableObject) {
    this.#go = gameObject;
  }

  get kinematic() {
    return this.#go.motionValue === State.Kinematic;
  }

  get solid() {
    return this.#go.motionValue === State.Solid;
  }

  toKinematic() {
    this.#set(State.Kinematic);
  }

  toSolid() {
    this.#set(State.Solid);
  }

  reset() {
    this.#go.motionValue = State.Solid;
  }

  #set(state: State) {
    if (this.#go.destroyed) {
      throw new Error(`${this.#go.name}.motion: called on destroyed object`);
    }

    this.#go.motionValue = state;
  }
}
