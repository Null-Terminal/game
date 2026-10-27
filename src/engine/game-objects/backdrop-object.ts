import type { BakedFrame } from "#engine/animation-loader/types";

import { BackgroundObject } from "#engine/game-objects/background-object";
import type { AxisFlags } from "#engine/game-objects/background-object/types";
import type { GameObjectOptions, RenderFrame, RenderFramePayload } from "#engine/game-objects/types";

import { BackdropLayout } from "#engine/game-objects/backdrop-object/layout";
import type { BackdropImagePosition, DefaultBackdropObjectOptions } from "#engine/game-objects/backdrop-object/types";

export type * from "#engine/game-objects/backdrop-object/types";

type DrawingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export class BackdropObject extends BackgroundObject<GameObjectOptions<DefaultBackdropObjectOptions>> {
  readonly #frames: BakedFrame[] = [];

  #layout: BackdropLayout | null = null;
  #seed = 0;

  #maxWidth = 0;
  #maxHeight = 0;

  #bakedX = NaN;
  #bakedY = NaN;

  #bakedStretch: AxisFlags | undefined = undefined;
  #bakedCanvas: OffscreenCanvas | null = null;

  init() {
    if (this.options.images.length === 0) {
      throw new Error("Backdrop image set must not be empty");
    }

    this.#frames.length = 0;
    this.#maxWidth = 0;
    this.#maxHeight = 0;

    for (const image of this.options.images) {
      const frame = image.getSpriteFrame(0, this.effects);

      if (!Number.isFinite(frame.height) || frame.height <= 0) {
        throw new RangeError("Backdrop image heights must be positive finite numbers");
      }

      this.#frames.push(frame);
      this.#maxWidth = Math.max(this.#maxWidth, frame.width);
      this.#maxHeight = Math.max(this.#maxHeight, frame.height);
    }

    this.#seed = this.options.seed ?? Math.floor(Math.random() * 0x100000000);
    this.#layout = this.#createLayout();
    this.play(this.options.images[0]!);

    // play задаёт размеры по первому изображению
    if (this.bbox == null) {
      this.width = this.#maxWidth;
      this.height = this.#maxHeight;
    }
  }

  override destroy() {
    if (this.destroyed) {
      return;
    }

    super.destroy();

    this.#layout = null;
    this.#frames.length = 0;
    this.#seed = 0;
    this.#maxWidth = 0;
    this.#maxHeight = 0;

    this.#clearBakedCanvas();
  }

  protected override renderFrame(payload: RenderFramePayload, _defaultRender: RenderFrame) {
    super.renderFrame(payload, this.#drawBackdrop);
  }

  protected override getStretchImage(_payload: RenderFramePayload, width: number, height: number): BakedFrame {
    return this.#getStretchCanvas(width, height);
  }

  #createLayout(): BackdropLayout {
    return new BackdropLayout(this.#frames, 0, {
      order: this.options.order ?? "shuffle",
      gap: this.options.gap ?? -1,
      seed: this.#seed
    });
  }

  #clearBakedCanvas() {
    if (this.#bakedCanvas != null) {
      this.#bakedCanvas.width = 0;
      this.#bakedCanvas.height = 0;
      this.#bakedCanvas = null;
    }

    this.#bakedStretch = undefined;
    this.#bakedX = NaN;
    this.#bakedY = NaN;
  }

  #drawBackdrop = (frame: RenderFramePayload) => {
    if (this.options.stretch) {
      const image = this.#getStretchCanvas(this.width, this.height);
      frame.ctx.drawImage(image, frame.x, frame.resolveY(frame.y), this.width, this.height);
      return;
    }

    if (this.options.static?.includes("w") && this.options.static?.includes("h")) {
      this.#drawFullyStatic(frame);
      return;
    }

    this.#drawLayout(frame, frame.ctx);
  };

  #drawFullyStatic(frame: RenderFramePayload) {
    const { width, height } = this.canvas.canvas;

    let image = this.#bakedCanvas;

    const needsRebake =
      image?.width !== width || image.height !== height ||
      this.#bakedStretch !== this.options.stretch ||
      this.#bakedX !== frame.x || this.#bakedY !== frame.y;

    if (needsRebake) {
      this.#clearBakedCanvas();

      image = new OffscreenCanvas(width, height);
      this.#drawLayout(frame, image.getContext("2d")!);

      this.#bakedCanvas = image;
      this.#bakedStretch = this.options.stretch;

      this.#bakedX = frame.x;
      this.#bakedY = frame.y;
    }

    frame.ctx.drawImage(image!, 0, 0);
  }

  #getStretchCanvas(width: number, height: number): OffscreenCanvas {
    const tileWidth = Math.ceil(width);
    const tileHeight = Math.ceil(height);

    const bakedCanvas = this.#bakedCanvas;
    const canReuseCanvas = bakedCanvas?.width === tileWidth &&
      bakedCanvas.height === tileHeight &&
      this.#bakedStretch === this.options.stretch;

    if (canReuseCanvas) {
      return bakedCanvas;
    }

    this.#clearBakedCanvas();

    const canvas = new OffscreenCanvas(tileWidth, tileHeight);
    const ctx = canvas.getContext("2d")!;

    const layout = this.#createLayout();
    const repeatY = this.options.stretch?.includes("h");

    layout.extendTo(tileWidth);

    for (const { index, x } of layout.positions) {
      if (x >= tileWidth) {
        break;
      }

      const image = this.#frames[index]!;

      if (repeatY) {
        for (let bottom = tileHeight; bottom > 0; bottom -= this.#maxHeight) {
          ctx.drawImage(image, x, bottom - image.height);
        }

      } else {
        ctx.drawImage(image, x, tileHeight - image.height);
      }
    }

    this.#bakedCanvas = canvas;
    this.#bakedStretch = this.options.stretch;

    return canvas;
  }

  #drawLayout(frame: RenderFramePayload, ctx: DrawingContext) {
    const { height: viewHeight } = this.canvas.canvas;

    const scrollX = this.getScrollOffset("w");
    const scrollY = this.getScrollOffset("h");

    const { left, top, right, bottom } = this.getVisibleBounds(scrollX, scrollY);

    // При бесконечной границе bbox начало композиции остаётся в нуле мира.
    const originX = Number.isFinite(frame.x) ? frame.x : -scrollX;
    const localLeft = left - originX;

    const localRight = right - originX;
    const layout = this.#layout;

    if (layout == null) {
      return;
    }

    if (localRight > 0) {
      layout.extendTo(localRight);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();

    const positions = layout.positions;
    const firstVisible = this.#findFirstVisiblePosition(positions, localLeft);
    const originBottom = Number.isFinite(frame.y) ? viewHeight - frame.y : viewHeight + scrollY;

    for (let i = firstVisible; i < positions.length; i++) {
      const { index, x } = positions[i]!;

      if (x >= localRight) {
        break;
      }

      const image = this.#frames[index]!;

      if (x + image.width <= localLeft) {
        continue;
      }

      ctx.drawImage(image, originX + x, originBottom - image.height);
    }

    ctx.restore();
  }

  #findFirstVisiblePosition(positions: readonly BackdropImagePosition[], left: number): number {
    let from = 0;
    let to = positions.length;

    while (from < to) {
      const middle = (from + to) >>> 1;

      if (positions[middle]!.x < left - this.#maxWidth) {
        from = middle + 1;

      } else {
        to = middle;
      }
    }

    return from;
  }
}
