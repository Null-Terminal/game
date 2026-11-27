import { InteractObject, type GameObject, type GameObjectOptions } from "#engine/game-objects";
import type { World } from "#engine/game";

import { PersonObject } from "#game/characters/person-object";

type ArenaBoundaryOptions = GameObjectOptions<{
  isLoaded: (world: World) => boolean;
  load: (world: World) => Promise<unknown>;
}>;

export class ArenaBoundaryObject extends InteractObject<ArenaBoundaryOptions> {
  #pending = false;

  override get sleepable() {
    return false;
  }

  override visit(go: GameObject) {
    if (!(go instanceof PersonObject)) {
      return;
    }

    if (this.#pending || this.options.isLoaded(this.world)) {
      return;
    }

    this.#pending = true;

    void Promise.resolve()
      .then(() => this.options.load(this.world))
      .catch((err: unknown) => console.error(`${this.constructor.name}: arena load failed`, err))
      .finally(() => { this.#pending = false; });
  }
}
