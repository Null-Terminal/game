import { cache } from "#decorators/cache";

import type { Game } from "#engine/game";

import type { PoolPointer } from "#engine/game-object-pool";

import { GameObject } from "#engine/game-objects/game-object";
import { BackgroundObjectDebug } from "#engine/game-objects/background-object/debug";
import { BackgroundObjectRender } from "#engine/game-objects/background-object/render";

import type { GameObjectOptions } from "#engine/game-objects/game-object";
import type { DefaultBackgroundObjectOptions } from "#engine/game-objects/background-object/types";

export type * from "#engine/game-objects/background-object/types";

export abstract class BackgroundObject<
  T extends GameObjectOptions<DefaultBackgroundObjectOptions> = GameObjectOptions<DefaultBackgroundObjectOptions>
> extends GameObject<T> {
  @cache
  override get render(): BackgroundObjectRender {
    return new BackgroundObjectRender(this);
  }

  @cache
  override get debug(): BackgroundObjectDebug {
    return new BackgroundObjectDebug(this);
  }

  override get redrawEvent() {
    const { background, overlay } = this.canvas.events;
    return this.options?.overlay ? overlay : background;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    const options = super.create(game, poolPointer, opts);
    const autoStretch = this.shouldAutoStretchInfiniteBounds();

    if (autoStretch && !Number.isFinite(this.width) && !options.stretch?.includes("w")) {
      options.stretch = options.stretch?.includes("h") ? "hw" : "w";
    }

    if (!Number.isFinite(this.height)) {
      this.height = Infinity;

      if (autoStretch && !options.stretch?.includes("h")) {
        options.stretch = options.stretch?.includes("w") ? "wh" : "h";
      }
    }

    return options;
  }

  syncSize() {
    const { width, height } = this.canvas.canvas;
    const { stretch } = this.options;

    // Синхронизируемся с размером холста, чтобы поддержать ресайз окна
    if (stretch?.includes("w")) {
      this.width = width;
    }

    if (stretch?.includes("h")) {
      this.height = height;
    }
  }

  protected shouldAutoStretchInfiniteBounds(): boolean {
    return true;
  }
}
