import type { Game } from "#engine/game";

import type { PoolPointer } from "#engine/game-object-pool";
import type { BakedFrame } from "#engine/animation-loader/types";

import { GameObject } from "#engine/game-objects/game-object";

import type { RenderFrame, RenderFramePayload } from "#engine/game-objects/types";
import type { GameObjectOptions, DefaultGameObjectOptions } from "#engine/game-objects/types";

export type Axis = "w" | "h";
export type AxisFlags = "" | Axis | `${Axis}${Axis}`;
export type ScrollFactor = [both: number] | [x: number, y: number];

export interface DefaultBackgroundObjectOptions extends DefaultGameObjectOptions {
  stretch?: AxisFlags;
  static?: AxisFlags;
  scrollFactor?: ScrollFactor;
}

export abstract class BackgroundObject<
  T extends GameObjectOptions<DefaultBackgroundObjectOptions> = GameObjectOptions<DefaultBackgroundObjectOptions>
> extends GameObject<T> {
  override get redrawEvent() {
    return this.canvas.events.background;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    const options = super.create(game, poolPointer, opts);

    if (!isFinite(this.width)) {
      options.stretch ??= "";
      options.stretch += "w";
    }

    if (!isFinite(this.height)) {
      this.height = Infinity;
      options.stretch ??= "";
      options.stretch += "h";
    }

    return options;
  }

  protected override renderFrame(payload: RenderFramePayload, defaultRender: RenderFrame) {
    const { game: { camera }, canvas: { canvas }, effects, options: opts } = this;

    const stretchWidth = opts.stretch?.includes("w");
    const stretchHeight = opts.stretch?.includes("h");

    // Синхронизируемся с размером холста, чтобы поддержать ресайз окна
    if (stretchWidth) {
      this.width = canvas.width;
    }

    if (stretchHeight) {
      this.height = canvas.height;
    }

    const staticWidth = opts.static?.includes("w");
    const staticHeight = opts.static?.includes("h");
    const [scrollFactorX, scrollFactorY = scrollFactorX] = opts.scrollFactor ?? [1];

    let { x, y } = payload;

    // Восстанавливаем состояние координат ДО скроллинга
    x += camera.x;
    y += camera.y;

    // Реализуем скроллинг с учетом static и scrollFactor
    if (!staticWidth) {
      x -= camera.x * scrollFactorX;
    }

    if (!staticHeight) {
      y -= camera.y * scrollFactorY;
    }

    payload.x = x;
    payload.y = y;

    const { ctx, pattern, frameIndex, animation, resolveY } = payload;

    if (pattern || stretchWidth || stretchHeight) {
      const wrapWidth = stretchWidth && !staticWidth;
      const wrapHeight = stretchHeight && !staticHeight;

      if (wrapWidth || wrapHeight) {
        const image = animation.getPatternFrame(frameIndex, this.width, this.height, effects);
        this.#stretchPattern(ctx, image, x, resolveY(y), wrapWidth, wrapHeight);

      } else {
        defaultRender(payload);
      }

    } else {
      defaultRender(payload);
    }
  }

  #stretchPattern(
    ctx: CanvasRenderingContext2D,
    pattern: BakedFrame,
    x: number,
    y: number,
    stretchWidth: boolean | undefined,
    stretchHeight: boolean | undefined
  ) {
    const { width: w, height: h, canvas: view } = this;

    const xs = stretchWidth ? axisCopies(x, w, view.width) : [x];
    const ys = stretchHeight ? axisCopies(y, h, view.height) : [y];

    for (const dx of xs) {
      for (const dy of ys) {
        ctx.drawImage(pattern, 0, 0, w, h, dx, dy, w, h);
      }
    }

    function axisCopies(origin: number, size: number, viewEnd: number) {
      if (size <= 1) {
        return [origin];
      }

      // Шаг size-1: 1px перекрытие, чтобы на дробных координатах не просвечивал шов
      const step = size - 1;

      // В JS остаток от деления отрицательного числа даст отрицательный результат
      let start = origin % step;

      // Положительный остаток сдвигаем на шаг влево, чтобы копия начиналась левее экрана
      if (start > 0) {
        start -= step;
      }

      const copies: number[] = [];

      // От самой левой копии, которая ещё цепляет экран, шагаем вправо пока p не уедет за viewEnd
      for (let point = start; point < viewEnd; point += step) {
        copies.push(point);
      }

      return copies.length > 0 ? copies : [origin];
    }
  }
}
