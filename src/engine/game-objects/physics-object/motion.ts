import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { PhysicsObject } from "#engine/game-objects/physics-object";

enum State {
  // Объект не взаимодействует со внешним миром, движение без коллизий
  Kinematic,

  // Объект взаимодействует со внешним миром, движение с учетом коллизий
  Solid,
}

export class PhysicsObjectMotion extends ServantObject<PhysicsObject> {
  static readonly State = State;

  #state = State.Solid;

  constructor(go: PhysicsObject) {
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
