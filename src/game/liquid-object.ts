import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { StaticInteractObject, ifAlive } from "#engine/game-objects";

import type { DefaultGameObjectOptions, GameObject } from "#engine/game-objects";
import type { BBoxTuple } from "#engine/rtree";

import { PersonObject } from "#game/person-object";

import { acid } from "#/sprites/hazards/acid";
import { water } from "#/sprites/hazards/water";

export type LiquidKind = keyof typeof LiquidObject.kinds;

export type LiquidObjectOptions = DefaultGameObjectOptions & {
  bbox: BBoxTuple;
  kind: LiquidKind;
  damagePerSecond?: number;
};

export class LiquidObject extends StaticInteractObject<LiquidObjectOptions> {
  static readonly kinds = {
    water: { show: water, damagePerSecond: 0 },
    acid: { show: acid, damagePerSecond: 35 }
  } as const;

  override create(game: Game, poolPointer: PoolPointer, opts?: LiquidObjectOptions) {
    if (opts == null) {
      throw new TypeError("Liquid kind is required");
    }

    return super.create(game, poolPointer, {
      ...LiquidObject.kinds[opts.kind],
      ...opts
    });
  }

  override get redrawEvent() {
    return this.canvas.events.background;
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
