import { cache } from "#decorators/cache";

import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";

import { GameObject } from "#engine/game-objects/game-object";
import type { GameObjectOptions } from "#engine/game-objects/game-object";

import { BackgroundObjectDebug } from "#engine/game-objects/background-object/debug";
import { BackgroundObjectRender } from "#engine/game-objects/background-object/render";
import { getBackgroundScrollFactor } from "#engine/game-objects/background-object/scroll-factor";

import type { DefaultBackgroundObjectOptions } from "#engine/game-objects/background-object/types";

export type * from "#engine/game-objects/background-object/types";

export class BackgroundObject<
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

  override get sleepable() {
    // Без bbox фон может покрывать весь экран независимо от размеров объекта
    return this.bbox != null;
  }

  init() {}

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

  override isFarFromViewport(distanceScreens: number): boolean {
    const { bbox } = this;

    if (bbox == null) {
      return false;
    }

    const { canvas, camera } = this.game;

    const offsetX = camera.x * getBackgroundScrollFactor(this.options, "w");
    const offsetY = camera.y * getBackgroundScrollFactor(this.options, "h");

    const marginX = distanceScreens * canvas.width;
    const marginY = distanceScreens * canvas.height;

    const farX = bbox[2] - offsetX < -marginX || bbox[0] - offsetX > canvas.width + marginX;
    const farY = bbox[3] - offsetY < -marginY || bbox[1] - offsetY > canvas.height + marginY;

    return farX || farY;
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
