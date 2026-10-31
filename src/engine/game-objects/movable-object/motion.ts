import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { MovableObject } from "#engine/game-objects/movable-object";

enum State {
  // Объект не взаимодействует со внешним миром, движение без коллизий
  Kinematic,

  // Объект взаимодействует со внешним миром, движение с учетом коллизий
  Solid,
}

export class MovableObjectMotion extends ServantObject<MovableObject> {
  static readonly State = State;

  #state = State.Solid;

  constructor(go: MovableObject) {
    super(go);
  }

  get kinematic() {
    return this.#state === State.Kinematic;
  }

  get solid() {
    return this.#state === State.Solid;
  }

  toKinematic() {
    this.#set(State.Kinematic);
  }

  toSolid() {
    this.#set(State.Solid);
  }

  reset() {
    this.#state = State.Solid;
  }

  @ifAlive
  #set(state: State) {
    this.#state = state;
  }
}
