import type { LoadedAnimation } from "#engine/animation";
import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { InteractObject, ifAlive } from "#engine/game-objects";
import type { DefaultGameObjectOptions, GameObject, GameObjectOptions } from "#engine/game-objects";

import { controlKinds } from "#game/control-object/kinds";
import { PersonObject } from "#game/person-object";

export type ControlKind = keyof typeof ControlObject.kinds;

export type ControlOptions = GameObjectOptions<DefaultGameObjectOptions & {
  kind: ControlKind;
  showActivate?: LoadedAnimation;
  showDeactivate?: LoadedAnimation;
}>;

export class ControlObject extends InteractObject<ControlOptions> {
  static readonly kinds = controlKinds;

  #active = false;

  override create(game: Game, poolPointer: PoolPointer, opts?: ControlOptions) {
    if (opts == null) {
      throw new TypeError("Control kind is required");
    }

    return super.create(game, poolPointer, {
      ...ControlObject.kinds[opts.kind],
      ...opts
    });
  }

  get active(): boolean {
    return this.#active;
  }

  override destroy() {
    if (this.destroyed) {
      return;
    }

    this.#active = false;
    super.destroy();
  }

  @ifAlive
  override visit(go: GameObject) {
    if (!(go instanceof PersonObject)) {
      return;
    }

    if (!go.consumeUse()) {
      return;
    }

    const { showActivate, showDeactivate } = this.options;

    if (this.#active && showDeactivate != null) {
      this.play(showDeactivate);
      this.#active = false;

    } else if (showActivate != null) {
      this.play(showActivate);
      this.#active = showDeactivate != null;
    }

    this.acceptor?.visit(this);
  }
}
