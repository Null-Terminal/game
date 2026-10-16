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
  overlay?: boolean;
}

const FULL_SPAN = [-Infinity, Infinity] as const;

export abstract class BackgroundObject<
  T extends GameObjectOptions<DefaultBackgroundObjectOptions> = GameObjectOptions<DefaultBackgroundObjectOptions>
> extends GameObject<T> {
  override get redrawEvent() {
    const { background, overlay } = this.canvas.events;
    return this.options?.overlay ? overlay : background;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    const options = super.create(game, poolPointer, opts);

    if (!Number.isFinite(this.width)) {
      options.stretch ??= "";
      options.stretch += "w";
    }

    if (!Number.isFinite(this.height)) {
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

    const scrollX = staticWidth ? 0 : camera.x * scrollFactorX;
    const scrollY = staticHeight ? 0 : camera.y * scrollFactorY;

    let { x, y } = payload;

    // Координаты payload.x/y уже содержат в себе скроллинг (камеру),
    // но для корректной реализации static и scrollFactor нужно отменить этот скроллинг и применить заново с уточнениями
    x += camera.x - scrollX;
    y += camera.y - scrollY;

    // Сохраняем обновленные координаты
    payload.x = x;
    payload.y = y;

    const { ctx, pattern, frameIndex, animation, resolveY } = payload;

    if (pattern || stretchWidth || stretchHeight) {
      const wrapWidth = stretchWidth && !staticWidth;
      const wrapHeight = stretchHeight && !staticHeight;

      if (wrapWidth || wrapHeight) {
        const image = animation.getPatternFrame(frameIndex, this.width, this.height, effects);
        this.#stretchPattern(ctx, image, x, y, wrapWidth, wrapHeight, scrollX, scrollY, resolveY);

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
    stretchHeight: boolean | undefined,
    scrollX: number,
    scrollY: number,
    resolveY: RenderFramePayload["resolveY"]
  ) {
    const { width: w, height: h, canvas: view, bbox } = this;

    const minX = bbox?.[0] ?? 0;
    const minY = bbox?.[1] ?? 0;
    const maxX = bbox?.[2] ?? 0;
    const maxY = bbox?.[3] ?? 0;

    const toScreenX = (worldX: number) => worldX - scrollX;
    const toScreenY = (worldY: number) => resolveY(worldY - scrollY) + h;

    // Границы на холсте, куда должна вписываться заливка (без bbox — весь экран)
    const [spanX1, spanX2] = bbox == null ? FULL_SPAN : this.#selectSpan(minX, maxX, toScreenX);
    const [spanY1, spanY2] = bbox == null ? FULL_SPAN : this.#selectSpan(maxY, minY, toScreenY);

    const originX = Number.isFinite(x) ? x : this.#selectPatternStart(minX, maxX, toScreenX, w);
    const originY = Number.isFinite(y) ? resolveY(y) : toScreenY(this.#selectFiniteEdge(minY, maxY)) - h;

    const xs = stretchWidth ? this.#findPatternPositions(originX, w, view.width) : [originX];
    const ys = stretchHeight ? this.#findPatternPositions(originY, h, view.height) : [originY];

    for (const dx of xs) {
      for (const dy of ys) {
        let srcX = 0;
        let srcY = 0;
        let srcW = w;
        let srcH = h;

        let destX = dx;
        let destY = dy;
        let destW = w;
        let destH = h;

        // Отрезаем левую часть паттерна, если она меньше spanX1
        if (destX < spanX1) {
          const cut = spanX1 - destX;
          srcX += cut;
          srcW -= cut;
          destX += cut;
          destW -= cut;
        }

        // Отрезаем правую часть паттерна, если она больше spanX2
        if (destX + destW > spanX2) {
          const cut = destX + destW - spanX2;
          srcW -= cut;
          destW -= cut;
        }

        // Отрезаем верхнюю часть паттерна, если она выше spanY1
        if (destY < spanY1) {
          const cut = spanY1 - destY;
          srcY += cut;
          srcH -= cut;
          destY += cut;
          destH -= cut;
        }

        // Отрезаем нижнюю часть паттерна, если она ниже spanY2
        if (destY + destH > spanY2) {
          const cut = destY + destH - spanY2;
          srcH -= cut;
          destH -= cut;
        }

        if (srcW > 0 && srcH > 0 && destW > 0 && destH > 0) {
          ctx.drawImage(pattern, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
        }
      }
    }
  }

  #findPatternPositions(origin: number, size: number, viewEnd: number): number[] {
    // Защита от бесконечного цикла
    if (size <= 1) {
      return [origin];
    }

    // Шаг size-1: 1px перекрытие, чтобы на дробных координатах не просвечивал шов
    const step = size - 1;

    // В JS остаток от деления отрицательного числа даст отрицательный результат
    let start = origin % step;

    // Положительный остаток сдвигаем к меньшей координате, чтобы копия начиналась до экрана
    if (start > 0) {
      start -= step;
    }

    const copies: number[] = [];

    // От копии с меньшей координатой, которая ещё цепляет экран, шагаем к viewEnd
    for (let point = start; point < viewEnd; point += step) {
      copies.push(point);
    }

    return copies.length > 0 ? copies : [origin];
  }

  #selectSpan(min: number, max: number, toScreen: (world: number) => number): [number, number] {
    const minFinite = Number.isFinite(min);
    const maxFinite = Number.isFinite(max);

    // Ограничиваем заливку по оси только при одной конечной границе.
    // Если конечны обе, stretch повторяет паттерн по всему холсту, несмотря на bbox.
    if (minFinite === maxFinite) {
      return [-Infinity, Infinity];
    }

    return [minFinite ? toScreen(min) : -Infinity, maxFinite ? toScreen(max) : Infinity];
  }

  #selectFiniteEdge(min: number, max: number): number {
    if (Number.isFinite(max) && !Number.isFinite(min)) {
      return max;
    }

    return Number.isFinite(min) ? min : 0;
  }

  #selectPatternStart(min: number, max: number, toScreen: (world: number) => number, size: number): number {
    const minFinite = Number.isFinite(min);
    const maxFinite = Number.isFinite(max);

    if (maxFinite && !minFinite) {
      return toScreen(max) - size;
    }

    if (minFinite) {
      return toScreen(min);
    }

    return toScreen(0);
  }
}
