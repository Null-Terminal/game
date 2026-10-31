import { GameObjectRender } from "#engine/game-objects/game-object/render";

import type { BakedFrame } from "#engine/animation-loader/types";
import type { BackgroundObject } from "#engine/game-objects/background-object";
import type { BitmapRenderFrame, BitmapRenderPayload, ObjectRenderPayload } from "#engine/game-objects/game-object";

type Axis = "w" | "h";

export interface VisibleBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class BackgroundObjectRender<T extends BackgroundObject = BackgroundObject> extends GameObjectRender<T> {
  // Переиспользуем границы, чтобы не создавать объект на каждом кадре
  readonly #visibleBounds: VisibleBounds = { left: 0, top: 0, right: 0, bottom: 0 };

  getVisibleBounds(frame: ObjectRenderPayload): Readonly<VisibleBounds> | null {
    const { bbox } = this.go;
    const { width, height } = this.go.canvas.canvas;

    const scrollX = frame.getScrollOffsetX(this.getScrollFactor("w"));
    const scrollY = frame.getScrollOffsetY(this.getScrollFactor("h"));

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

    return this.isVisibleInViewport(bounds.left, bounds.top, bounds.right, bounds.bottom) ? bounds : null;
  }

  override drawBitmap(payload: BitmapRenderPayload, defaultRender: BitmapRenderFrame) {
    const { go } = this;
    const { options: opts } = go;

    const wrapWidth = opts.stretch?.includes("w") && !opts.static?.includes("w");
    const wrapHeight = opts.stretch?.includes("h") && !opts.static?.includes("h");

    const factorX = this.getScrollFactor("w");
    const factorY = this.getScrollFactor("h");

    go.syncSize();
    payload.x = payload.getScreenX(factorX);
    payload.y = payload.getScreenY(factorY);

    const bounds = this.getVisibleBounds(payload);

    if (bounds == null) {
      return;
    }

    if (!wrapWidth && !wrapHeight) {
      defaultRender(payload);
      return;
    }

    const image = payload.animation.getPatternFrame(payload.frameIndex, go.width, go.height, go.effects);
    this.drawPattern(payload, image, bounds);
  }

  drawPattern(
    payload: ObjectRenderPayload,
    pattern: BakedFrame,
    bounds?: Readonly<VisibleBounds>
  ) {
    const { go } = this;
    const { width: w, height: h, bbox } = go;
    const factorX = this.getScrollFactor("w");
    const factorY = this.getScrollFactor("h");
    const stretchWidth = go.options.stretch?.includes("w") && !go.options.static?.includes("w");
    const stretchHeight = go.options.stretch?.includes("h") && !go.options.static?.includes("h");
    const scrollX = payload.getScrollOffsetX(factorX);
    const scrollY = payload.getScrollOffsetY(factorY);
    const visible = bounds ?? this.getVisibleBounds(payload);

    if (visible == null) {
      return;
    }

    payload.x = payload.getScreenX(factorX);
    payload.y = payload.getScreenY(factorY);
    const { ctx, x, y, toCanvasTop } = payload;

    const minX = bbox?.[0] ?? 0;
    const minY = bbox?.[1] ?? 0;
    const maxX = bbox?.[2] ?? 0;
    const maxY = bbox?.[3] ?? 0;

    const { left: spanX1, top: spanY1, right: spanX2, bottom: spanY2 } = visible;

    const originX = Number.isFinite(x) ? x : this.#selectPatternStart(minX, maxX, scrollX, w);
    const originY = Number.isFinite(y) ? toCanvasTop(y) : toCanvasTop(this.#selectFiniteEdge(minY, maxY) - scrollY);

    const stepX = stretchWidth ? Math.max(1, w - 1) : Infinity;
    const stepY = stretchHeight ? Math.max(1, h - 1) : Infinity;

    const firstX = stretchWidth ? this.#firstPatternPosition(originX, w, spanX1) : originX;
    const firstY = stretchHeight ? this.#firstPatternPosition(originY, h, spanY1) : originY;

    const showStretchSeams = go.options.debug?.stretchSeams;

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
            go.debug.drawStretchSeams(ctx, {
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

  protected getScrollFactor(axis: Axis): number {
    if (this.go.options.static?.includes(axis)) {
      return 0;
    }

    const { scrollFactor } = this.go.options;

    return axis === "w" ?
      scrollFactor?.[0] ?? 1 :
      scrollFactor?.[1] ?? scrollFactor?.[0] ?? 1;
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

  #selectPatternStart(min: number, max: number, scroll: number, size: number): number {
    const minFinite = Number.isFinite(min);
    const maxFinite = Number.isFinite(max);

    if (maxFinite && !minFinite) {
      return max - scroll - size;
    }

    if (minFinite) {
      return min - scroll;
    }

    return -scroll;
  }
}
