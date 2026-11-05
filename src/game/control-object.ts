import type { LoadedAnimation } from "#engine/animation";
import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { StaticInteractObject, ifAlive } from "#engine/game-objects";
import type { DefaultGameObjectOptions, GameObject, GameObjectOptions } from "#engine/game-objects";

import { PersonObject } from "#game/person-object";

import { accessButton } from "#/sprites/interactables/button-access";
import { emergencyButton } from "#/sprites/interactables/button-emergency";
import { floorLever } from "#/sprites/interactables/lever-floor";
import { wallLever } from "#/sprites/interactables/lever-wall";
import { aiTerminal } from "#/sprites/interactables/terminal-ai";
import { resistanceTerminal } from "#/sprites/interactables/terminal-resistance";

export type ControlKind = keyof typeof ControlObject.kinds;

export type ControlOptions = GameObjectOptions<DefaultGameObjectOptions & {
  kind: ControlKind;
  showActivate?: LoadedAnimation;
  showDeactivate?: LoadedAnimation;
}>;

export class ControlObject extends StaticInteractObject<ControlOptions> {
  static readonly kinds = {
    floorLever: {
      show: floorLever.idle,
      showActivate: floorLever.activate,
      showDeactivate: floorLever.deactivate
    },
    wallLever: {
      show: wallLever.idle,
      showActivate: wallLever.activate,
      showDeactivate: wallLever.deactivate
    },
    emergencyButton: { show: emergencyButton.idle, showActivate: emergencyButton.press },
    accessButton: { show: accessButton.idle, showActivate: accessButton.press },
    aiTerminal: {
      show: aiTerminal.idle,
      showActivate: aiTerminal.activate,
      showDeactivate: aiTerminal.deactivate
    },
    resistanceTerminal: {
      show: resistanceTerminal.idle,
      showActivate: resistanceTerminal.activate,
      showDeactivate: resistanceTerminal.deactivate
    }
  } as const;

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
    super.destroy();
    this.#active = false;
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
