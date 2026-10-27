import type { Game } from "#engine/game";

import type { PoolPointer } from "#engine/game-object-pool";
import type { BakedFrame } from "#engine/animation-loader/types";

import { GameObject } from "#engine/game-objects/game-object";
import { drawDebugOutline, drawDebugStretchSeams } from "#engine/game-objects/debug-drawing";

import type { GameObjectOptions, RenderFrame, RenderFramePayload } from "#engine/game-objects/types";
import type { Axis, DefaultBackgroundObjectOptions, VisibleBounds } from "#engine/game-objects/background-object/types";

export type * from "#engine/game-objects/background-object/types";

export abstract class BackgroundObject<
  T extends GameObjectOptions<DefaultBackgroundObjectOptions> = GameObjectOptions<DefaultBackgroundObjectOptions>
> extends GameObject<T> {
  // Переиспользуем границы, чтобы не создавать объект на каждом кадре
  readonly #visibleBounds: VisibleBounds = { left: 0, top: 0, right: 0, bottom: 0 };

  override get redrawEvent() {
    const { background, overlay } = this.canvas.events;
    return this.options?.overlay ? overlay : background;
  }

  override create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    const options = super.create(game, poolPointer, opts);

    if (!Number.isFinite(this.width) && !options.stretch?.includes("w")) {
      options.stretch = options.stretch?.includes("h") ? "hw" : "w";
    }

    if (!Number.isFinite(this.height)) {
      this.height = Infinity;

      if (!options.stretch?.includes("h")) {
        options.stretch = options.stretch?.includes("w") ? "wh" : "h";
      }
    }

    return options;
  }

  protected override renderFrame(payload: RenderFramePayload, defaultRender: RenderFrame) {
    const { game: { camera }, canvas: { canvas }, options: opts } = this;

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

    const scrollX = this.getScrollOffset("w");
    const scrollY = this.getScrollOffset("h");

    let { x, y } = payload;

    // Координаты payload.x/y уже содержат в себе скроллинг (камеру),
    // но для корректной реализации static и scrollFactor нужно отменить этот скроллинг и применить заново с уточнениями
    x += camera.x - scrollX;
    y += camera.y - scrollY;

    // Сохраняем обновленные координаты
    payload.x = x;
    payload.y = y;

    const wrapWidth = stretchWidth && !staticWidth;
    const wrapHeight = stretchHeight && !staticHeight;
    const bounds = this.getVisibleBounds(scrollX, scrollY);

    if (!this.isVisibleInViewport(bounds.left, bounds.top, bounds.right, bounds.bottom)) {
      return;
    }

    if (!wrapWidth && !wrapHeight) {
      defaultRender(payload);
      return;
    }

    const image = this.getStretchImage(payload, this.width, this.height);
    this.#stretchPattern(payload, image, wrapWidth, wrapHeight, scrollX, scrollY, bounds);
  }

  protected override drawDebug(payload: RenderFramePayload) {
    if (this.bbox == null) {
      super.drawDebug(payload);
      return;
    }

    if (!this.options.debug?.outline) {
      return;
    }

    const bounds = this.getVisibleBounds(this.getScrollOffset("w"), this.getScrollOffset("h"));
    drawDebugOutline(payload.ctx, this.options.debug.outline, bounds.left, bounds.top, bounds.right, bounds.bottom);
  }

  protected getStretchImage(payload: RenderFramePayload, width: number, height: number): BakedFrame {
    return payload.animation.getPatternFrame(payload.frameIndex, width, height, this.effects);
  }

  protected getScrollOffset(axis: Axis): number {
    if (this.options.static?.includes(axis)) {
      return 0;
    }

    const factor = axis === "w" ?
      this.options.scrollFactor?.[0] ?? 1 :
      this.options.scrollFactor?.[1] ?? this.options.scrollFactor?.[0] ?? 1;

    return (axis === "w" ? this.game.camera.x : this.game.camera.y) * factor;
  }

  protected getVisibleBounds(scrollX: number, scrollY: number): Readonly<VisibleBounds> {
    const { bbox } = this;
    const { width, height } = this.canvas.canvas;

    const bounds = this.#visibleBounds;

    if (bbox == null) {
      bounds.left = 0;
      bounds.top = 0;
      bounds.right = width;
      bounds.bottom = height;

    } else {
      bounds.left = Math.max(0, bbox[0] - scrollX);
      bounds.top = Math.max(0, height - bbox[3] + scrollY);
      bounds.right = Math.min(width, bbox[2] - scrollX);
      bounds.bottom = Math.min(height, height - bbox[1] + scrollY);
    }

    return bounds;
  }

  #stretchPattern(
    payload: RenderFramePayload,
    pattern: BakedFrame,
    stretchWidth: boolean | undefined,
    stretchHeight: boolean | undefined,
    scrollX: number,
    scrollY: number,
    bounds: Readonly<VisibleBounds>
  ) {
    const { width: w, height: h, bbox } = this;
    const { ctx, x, y, resolveY } = payload;

    const minX = bbox?.[0] ?? 0;
    const minY = bbox?.[1] ?? 0;
    const maxX = bbox?.[2] ?? 0;
    const maxY = bbox?.[3] ?? 0;

    const toScreenX = (worldX: number) => worldX - scrollX;
    const toScreenY = (worldY: number) => resolveY(worldY - scrollY) + h;

    const { left: spanX1, top: spanY1, right: spanX2, bottom: spanY2 } = bounds;

    const originX = Number.isFinite(x) ? x : this.#selectPatternStart(minX, maxX, toScreenX, w);
    const originY = Number.isFinite(y) ? resolveY(y) : toScreenY(this.#selectFiniteEdge(minY, maxY)) - h;

    const stepX = stretchWidth ? Math.max(1, w - 1) : Infinity;
    const stepY = stretchHeight ? Math.max(1, h - 1) : Infinity;

    const firstX = stretchWidth ? this.#firstPatternPosition(originX, w, spanX1) : originX;
    const firstY = stretchHeight ? this.#firstPatternPosition(originY, h, spanY1) : originY;

    const showStretchSeams = this.options.debug?.stretchSeams;

    for (let dx = firstX; dx < spanX2; dx += stepX) {
      for (let dy = firstY; dy < spanY2; dy += stepY) {
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

          if (showStretchSeams) {
            drawDebugStretchSeams(ctx, {
              x: dx,
              y: dy,
              left: destX,
              top: destY,
              right: destX + destW,
              bottom: destY + destH
            }, stretchWidth, stretchHeight);
          }
        }
      }
    }

  }

  #firstPatternPosition(origin: number, size: number, visibleStart: number): number {
    // Перекрываем соседние плитки на 1 px, но для плитки размером 1 px шаг остаётся равным 1
    const step = Math.max(1, size - 1);
    let start = origin % step;

    if (start > 0) {
      start -= step;
    }

    if (start + size <= visibleStart) {
      start += Math.ceil((visibleStart - start - size) / step) * step;
    }

    return start;
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
