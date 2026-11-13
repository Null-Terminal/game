import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { ColliderObject, ifAlive } from "#engine/game-objects";
import type { DefaultGameObjectOptions, GameObject, GameObjectOptions } from "#engine/game-objects";

import { ControlObject } from "#game/control-object";

export type PlatformOptions = GameObjectOptions<DefaultGameObjectOptions & {
  maxStepHeight?: number;
}>;

export class PlatformObject<T extends PlatformOptions = PlatformOptions> extends ColliderObject<T> {
  override init() {
    this.motion.toKinematic();
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    return super.create(game, poolPointer, {
      maxStepHeight: 8,
      ...opts
    } as T);
  }

  override allows(go: GameObject, kind: "stepUp", height: number): boolean;
  override allows(go: GameObject, kind: string, opts?: unknown): boolean | null;
  override allows(_go: GameObject, kind: string, opts?: unknown): boolean | null {
    if (kind !== "stepUp") {
      return null;
    }

    return typeof opts === "number" && opts <= this.options.maxStepHeight!;
  }

  @ifAlive
  override visit(go: GameObject) {
    if (go instanceof ControlObject) {
      this.status.togglePause();
    }
  }
}
