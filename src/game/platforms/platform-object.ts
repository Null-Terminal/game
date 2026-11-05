import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { DynamicObject, ifAlive } from "#engine/game-objects";
import type { DefaultGameObjectOptions, GameObject, GameObjectOptions } from "#engine/game-objects";

import { ControlObject } from "#game/control-object";

export type PlatformOptions = GameObjectOptions<DefaultGameObjectOptions & {
  maxStepHeight?: number;
}>;

export class PlatformObject<T extends PlatformOptions = PlatformOptions> extends DynamicObject<T> {
  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    const options = { ...opts } as T;
    options.maxStepHeight ??= 8;
    return super.create(game, poolPointer, options);
  }

  override allows(go: GameObject, kind: "stepUp", height: number): boolean;
  override allows(go: GameObject, kind: string, options?: unknown): boolean | null;
  override allows(_go: GameObject, kind: string, options?: unknown): boolean | null {
    if (kind !== "stepUp") {
      return null;
    }

    return typeof options === "number" && options <= this.options.maxStepHeight!;
  }

  @ifAlive
  override visit(go: GameObject) {
    if (go instanceof ControlObject) {
      this.status.togglePause();
    }
  }
}
