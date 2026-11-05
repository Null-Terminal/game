import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { DynamicInteractObject, ifAlive } from "#engine/game-objects";
import type { DefaultGameObjectOptions, GameObject, GameObjectOptions } from "#engine/game-objects";

import { PersonObject } from "#game/person-object";

import { fuelCanister } from "#/sprites/interactables/fuel-canister";
import { medkit } from "#/sprites/interactables/medkit";

export type PickupKind = keyof typeof PickupObject.kinds;
export type PickupOptions = GameObjectOptions<DefaultGameObjectOptions & { kind: PickupKind }>;

export class PickupObject extends DynamicInteractObject<PickupOptions> {
  static readonly kinds = {
    fuel: { show: fuelCanister, stat: "fuel", max: "fuelMax", gain: 20 },
    medkit: { show: medkit, stat: "hp", max: "hpMax", gain: 35 }
  } as const;

  override create(game: Game, poolPointer: PoolPointer, opts?: PickupOptions) {
    if (opts == null) {
      throw new TypeError("Pickup kind is required");
    }

    return super.create(game, poolPointer, {
      show: PickupObject.kinds[opts.kind].show,
      ...opts
    });
  }

  @ifAlive
  override visit(go: GameObject) {
    if (!(go instanceof PersonObject)) {
      return;
    }

    const { stat, max, gain } = PickupObject.kinds[this.options.kind];

    if (go.stats[stat] < go.stats[max]) {
      go.updateStats((stats) => ({ [stat]: stats[stat] + gain }));
      this.destroy();
    }
  }
}
