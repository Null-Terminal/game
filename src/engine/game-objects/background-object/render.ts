import { GameObjectRender } from "#engine/game-objects/game-object/render";
import { getBackgroundScrollFactor } from "#engine/game-objects/background-object/scroll-factor";

import type * as go from "#engine/game-objects/game-object";
import type { BackgroundObject } from "#engine/game-objects/background-object";
import type { RenderContext } from "#engine/rendering";

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
  readonly #repeatBounds: VisibleBounds = { left: 0, top: 0, right: 0, bottom: 0 };

  getVisibleBounds(frame: go.ObjectRenderPayload): Readonly<VisibleBounds> | null {
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

  override drawBitmap(payload: go.BitmapRenderPayload) {
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
      super.drawBitmap(payload);
      return;
    }

    const { repeat } = payload.animation.animation.params;

    if ((wrapWidth && repeat?.width != null) || (wrapHeight && repeat?.height != null)) {
      this.#drawRepeatRegions(payload, bounds, Boolean(wrapWidth), Boolean(wrapHeight));
      return;
    }

    const image = payload.animation.getPatternFrame(payload.frameIndex, go.width, go.height, go.effects);
    this.drawPattern(payload, image, bounds);
  }

  drawPattern(
    payload: go.ObjectRenderPayload,
    pattern: ImageBitmap,
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

    const originX = Number.isFinite(x) ? x : this.#selectPatternStart(minX, maxX, scrollX, w);
    const originY = Number.isFinite(y) ? toCanvasTop(y) : toCanvasTop(this.#selectFiniteEdge(minY, maxY) - scrollY);

    const stepX = stretchWidth ? Math.max(1, w - 1) : Infinity;
    const stepY = stretchHeight ? Math.max(1, h - 1) : Infinity;

    this.#fillPattern(ctx, pattern, visible, originX, originY, w, h, stepX, stepY);
  }

  protected getScrollFactor(axis: Axis): number {
    return getBackgroundScrollFactor(this.go.options, axis);
  }

  #drawRepeatRegions(
    payload: go.BitmapRenderPayload,
    bounds: Readonly<VisibleBounds>,
    repeatWidth: boolean,
    repeatHeight: boolean
  ) {
    const { go } = this;
    const { animation, frameIndex, ctx } = payload;
    const { width: viewWidth, height: viewHeight } = go.canvas.canvas;

    const bbox = go.bbox;
    const image = animation.getSpriteFrame(frameIndex, go.effects);
    const sprite = animation.animation.at(frameIndex)!;

    const { repeat } = animation.animation.params;

    const minX = bbox?.[0] ?? 0;
    const maxX = bbox?.[2] ?? 0;
    const maxY = bbox?.[3] ?? 0;

    const scrollX = payload.getScrollOffsetX(this.getScrollFactor("w"));
    const scrollY = payload.getScrollOffsetY(this.getScrollFactor("h"));

    const originX = Number.isFinite(payload.x) ?
      payload.x :
      this.#selectPatternStart(minX, maxX, scrollX, image.width);

    const originY = Number.isFinite(payload.y) ?
      payload.toCanvasTop(payload.y) :
      viewHeight - maxY + scrollY;

    const left = Math.max(bounds.left, repeatWidth ? bounds.left : originX);
    const right = Math.min(bounds.right, repeatWidth ? bounds.right : originX + image.width);
    const top = Math.max(bounds.top, originY);
    const bottom = Math.min(bounds.bottom, originY + image.height);

    const hasVerticalRepeat = bounds.top < originY || bounds.bottom > originY + image.height;
    const hasHorizontalRepeat = bounds.left < originX || bounds.right > originX + image.width;
    const visible = this.#repeatBounds;

    // Повторы не заходят на центральный кадр, чтобы прозрачность не накладывалась дважды
    if (repeatHeight && left < right && hasVerticalRepeat) {
      const pattern = animation.getPatternFrame(frameIndex, viewWidth, viewHeight, "height", go.effects);
      const patternX = originX + (repeat?.height?.x ?? 0) * image.width / sprite.width;
      const patternY = originY + image.height;

      visible.left = left;
      visible.right = right;
      visible.top = bounds.top;
      visible.bottom = Math.min(bounds.bottom, originY);
      this.#fillPattern(ctx, pattern, visible, patternX, patternY);

      visible.top = Math.max(bounds.top, originY + image.height);
      visible.bottom = bounds.bottom;
      this.#fillPattern(ctx, pattern, visible, patternX, patternY);
    }

    if (repeatWidth && top < bottom && hasHorizontalRepeat) {
      const pattern = animation.getPatternFrame(frameIndex, viewWidth, image.height, "width", go.effects);
      const patternX = originX + image.width;
      const patternY = originY + (repeat?.width?.y ?? 0) * image.height / sprite.height;

      visible.top = top;
      visible.bottom = bottom;
      visible.left = bounds.left;
      visible.right = Math.min(bounds.right, originX);
      this.#fillPattern(ctx, pattern, visible, patternX, patternY);

      visible.left = Math.max(bounds.left, originX + image.width);
      visible.right = bounds.right;
      this.#fillPattern(ctx, pattern, visible, patternX, patternY);
    }

    const centerVisible = originX < bounds.right && originX + image.width > bounds.left &&
      originY < bounds.bottom && originY + image.height > bounds.top;

    if (centerVisible) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
      ctx.clip();
      ctx.drawImage(image, originX, originY);
      ctx.restore();
    }
  }

  #fillPattern(
    ctx: RenderContext,
    pattern: ImageBitmap,
    bounds: Readonly<VisibleBounds>,
    originX: number,
    originY: number,
    width = pattern.width,
    height = pattern.height,
    stepX = width,
    stepY = height
  ) {
    const { left, top, right, bottom } = bounds;

    if (left >= right || top >= bottom) {
      return;
    }

    const firstX = this.#firstPatternPosition(originX, width, left, stepX);
    const firstY = this.#firstPatternPosition(originY, height, top, stepY);
    const showSeams = this.go.options.debug?.stretchSeams;

    for (let x = firstX; x < right; x += stepX) {
      for (let y = firstY; y < bottom; y += stepY) {
        const drawX = Math.max(x, left);
        const drawY = Math.max(y, top);

        const drawRight = Math.min(x + width, right);
        const drawBottom = Math.min(y + height, bottom);

        if (drawX >= drawRight || drawY >= drawBottom) {
          continue;
        }

        const drawWidth = drawRight - drawX;
        const drawHeight = drawBottom - drawY;

        ctx.drawImage(
          pattern,
          drawX - x, drawY - y, drawWidth, drawHeight,
          drawX, drawY, drawWidth, drawHeight
        );

        if (showSeams) {
          this.go.debug.drawStretchSeams(ctx, {
            x, y,
            left: drawX, top: drawY,
            right: drawRight, bottom: drawBottom
          }, Number.isFinite(stepX), Number.isFinite(stepY));
        }
      }
    }
  }

  #firstPatternPosition(origin: number, size: number, visibleStart: number, step: number): number {
    if (!Number.isFinite(step)) {
      return origin;
    }

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
