import { InteractObject, type GameObject, type GameObjectOptions } from "#engine/game-objects";
import type { World } from "#engine/game";

import { PersonObject } from "#game/characters/person-object";

type ArenaBoundaryOptions = GameObjectOptions<{
  axis: "x" | "y";
  threshold: number;
  direction: "increasing" | "decreasing";
  isLoaded: (world: World) => boolean;
  load: (world: World) => Promise<unknown>;
}>;

export class ArenaBoundaryObject extends InteractObject<ArenaBoundaryOptions> {
  #pending = false;

  override visit(go: GameObject) {
    if (!(go instanceof PersonObject)) {
      return;
    }

    const { axis, threshold, direction } = this.options;
    const center = axis === "x" ? go.x + go.width / 2 : go.y + go.height / 2;
    const across = direction === "increasing" ? center >= threshold : center < threshold;

    if (!across || this.#pending || this.options.isLoaded(this.world)) {
      return;
    }

    this.#pending = true;

    void Promise.resolve()
      .then(() => this.options.load(this.world))
      .catch((err: unknown) => console.error(`${this.constructor.name}: arena load failed`, err))
      .finally(() => { this.#pending = false; });
  }
}
