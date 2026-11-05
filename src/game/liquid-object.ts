import type { LoadedAnimation } from "#engine/animation";

import { StaticInteractObject, ifAlive } from "#engine/game-objects";

import type { DefaultGameObjectOptions, GameObject } from "#engine/game-objects";
import type { BBoxTuple } from "#engine/rtree";

import { PersonObject } from "#game/person-object";

export type LiquidObjectOptions = DefaultGameObjectOptions & {
  bbox: BBoxTuple;
  show: LoadedAnimation;
  damagePerSecond?: number;
};

export class LiquidObject extends StaticInteractObject<LiquidObjectOptions> {
  override get redrawEvent() {
    return this.canvas.events.static;
  }

  @ifAlive
  override visit(go: GameObject) {
    if (!(go instanceof PersonObject)) {
      return;
    }

    const damage = this.options.damagePerSecond;

    if (damage == null || damage <= 0) {
      return;
    }

    go.updateStats(({ hp }) => ({
      hp: hp - damage * this.canvas.delta
    }));
  }
}
