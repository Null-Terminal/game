import type { LoadedAnimation } from "#engine/animation-loader";

import { BackgroundObject } from "#engine/game-objects/background-object";
import { ifAlive } from "#engine/game-objects/decorators";
import type { AnimationInstance, GameObject, GameObjectOptions, ObjectRenderPayload, PlayableAnimation } from "#engine/game-objects/game-object";

import { AnimationPlayback } from "#engine/game-objects/game-object/animation-playback";

import { FlowLayout } from "#engine/game-objects/background-flow-object/layout";
import type { FlowPosition } from "#engine/game-objects/background-flow-object/layout";
import type { BackgroundFlowDirection, DefaultBackgroundFlowObjectOptions } from "#engine/game-objects/background-flow-object/types";

export type * from "#engine/game-objects/background-flow-object/types";

export class BackgroundFlowObject extends BackgroundObject<GameObjectOptions<DefaultBackgroundFlowObjectOptions>> {
  static override readonly animations = {
    flow: (go: GameObject) => {
      if (!(go instanceof BackgroundFlowObject)) {
        throw new TypeError("Flow animation requires a BackgroundFlowObject");
      }

      return go.#createCompositionPlayback();
    }
  };

  override readonly animations = BackgroundFlowObject.animations;

  #layout: FlowLayout | null = null;
  #playbacks: AnimationPlayback[] = [];

  #playingSprites: readonly LoadedAnimation[] | null = null;
  #direction: BackgroundFlowDirection = "horizontal";

  #seed = 0;
  #maxSize = 0;

  init() {
    this.#seed = this.options.seed ?? Math.floor(Math.random() * 0x100000000);
    this.play(this.options.sprites);
  }

  override destroy() {
    if (this.destroyed) {
      return;
    }

    super.destroy();

    this.#layout = null;
    this.#playbacks.length = 0;
    this.#playingSprites = null;
    this.#seed = 0;
    this.#maxSize = 0;
  }

  @ifAlive
  override play(input: PlayableAnimation | readonly LoadedAnimation[]) {
    if (this.#isComposition(input)) {
      this.#playingSprites = input;
      super.play(this.animations.flow);
      return;
    }

    super.play(input);
    this.#playingSprites = null;
  }

  @ifAlive
  override ensurePlaying(input: PlayableAnimation | readonly LoadedAnimation[]) {
    if (this.#isComposition(input)) {
      if (this.#playingSprites !== input) {
        this.play(input);
      }

      return;
    }

    if (this.nowPlaying !== input) {
      this.play(input);
    }
  }

  protected override shouldAutoStretchInfiniteBounds(): boolean {
    return false;
  }

  #isComposition(input: PlayableAnimation | readonly LoadedAnimation[]): input is readonly LoadedAnimation[] {
    return Array.isArray(input);
  }

  #createCompositionPlayback(): AnimationInstance {
    const sprites = this.#playingSprites ?? this.options.sprites;

    if (sprites.length === 0) {
      throw new Error("Background flow must contain at least one sprite");
    }

    const playbacks: AnimationPlayback[] = [];

    const sizes: number[] = [];
    const direction = this.options.direction ?? "horizontal";

    let maxWidth = 0;
    let maxHeight = 0;

    for (const sprite of sprites) {
      const playback = new AnimationPlayback(sprite);

      const width = sprite.maxWidth * this.effects.scale;
      const height = sprite.maxHeight * this.effects.scale;

      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        throw new RangeError("Background flow sprite dimensions must be positive finite numbers");
      }

      playbacks.push(playback);
      const size = direction === "horizontal" ? width : height;
      sizes.push(size);

      maxWidth = Math.max(maxWidth, width);
      maxHeight = Math.max(maxHeight, height);
    }

    const layout = new FlowLayout(sizes, {
      order: this.options.order ?? "shuffle",
      gap: this.options.gap ?? -1,
      seed: this.#seed
    });

    this.#playbacks = playbacks;
    this.#layout = layout;
    this.#maxSize = direction === "horizontal" ? maxWidth : maxHeight;
    this.#direction = direction;

    if (this.bbox == null) {
      this.width = maxWidth;
      this.height = maxHeight;
    }

    return {
      draw: (frame) => this.#drawComposition(frame),

      advance: (elapsed) => {
        for (const playback of this.#playbacks) {
          playback.advance(elapsed);
        }
      },

      destroy: () => {
        this.#layout = null;
        this.#playbacks.length = 0;
        this.#maxSize = 0;
      }
    };
  }

  #drawComposition(frame: ObjectRenderPayload) {
    const scrollX = this.getScrollOffset("w");
    const scrollY = this.getScrollOffset("h");

    this.prepareRenderFrame(frame, scrollX, scrollY);

    const bounds = this.getVisibleBounds(scrollX, scrollY);
    const layout = this.#layout;

    if (bounds == null || layout == null) {
      return;
    }

    const { width: viewWidth, height: viewHeight } = this.canvas.canvas;

    const stretchWidth = this.options.stretch?.includes("w") ?? false;
    const stretchHeight = this.options.stretch?.includes("h") ?? false;

    const staticWidth = this.options.static?.includes("w");
    const staticHeight = this.options.static?.includes("h");

    const wrapWidth = stretchWidth && !staticWidth;
    const wrapHeight = stretchHeight && !staticHeight;

    const tileWidth = stretchWidth ? this.#getTileSize("w", viewWidth) : Infinity;
    const tileHeight = stretchHeight ? this.#getTileSize("h", viewHeight) : Infinity;

    const originX = Number.isFinite(frame.x) ? frame.x : -scrollX;
    const originBottom = Number.isFinite(frame.y) ? viewHeight - frame.y : viewHeight + scrollY;

    const horizontal = this.#direction === "horizontal";

    const layoutEnd = horizontal ?
      (stretchWidth ? tileWidth : bounds.right - originX) :
      (stretchHeight ? tileHeight : originBottom - bounds.top);

    if (layoutEnd > 0) {
      layout.extendTo(layoutEnd);
    }

    const stepX = wrapWidth ? Math.max(1, tileWidth - 1) : Infinity;
    const stepY = wrapHeight ? Math.max(1, tileHeight - 1) : Infinity;

    const firstX = wrapWidth ? originX + Math.floor((bounds.left - originX) / stepX) * stepX : originX;

    const originTop = originBottom - tileHeight;
    const firstY = wrapHeight ? originTop + Math.floor((bounds.top - originTop) / stepY) * stepY : bounds.top;

    for (let tileX = firstX; tileX < bounds.right; tileX += stepX) {
      const left = Math.max(bounds.left, tileX);
      const right = stretchWidth ? Math.min(bounds.right, tileX + tileWidth) : bounds.right;

      if (left >= right) {
        continue;
      }

      for (let tileY = firstY; tileY < bounds.bottom; tileY += stepY) {
        const top = Math.max(bounds.top, tileY);
        const bottom = stretchHeight ? Math.min(bounds.bottom, tileY + tileHeight) : bounds.bottom;

        if (top >= bottom) {
          continue;
        }

        const tileBottom = wrapHeight ? tileY + tileHeight : originBottom;
        this.#drawTile(frame.ctx, layout.positions, tileX, tileBottom, left, top, right, bottom);

        if (this.options.debug?.stretchSeams) {
          this.debug.drawStretchSeams(frame.ctx, {
            x: tileX,
            y: tileY,
            left,
            top,
            right,
            bottom
          }, wrapWidth, wrapHeight);
        }
      }
    }

    this.debug.draw(frame, this.bbox != null ? bounds : undefined);
  }

  #drawTile(
    ctx: CanvasRenderingContext2D,
    positions: readonly FlowPosition[],
    originX: number,
    originBottom: number,
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    const horizontal = this.#direction === "horizontal";

    const localStart = horizontal ? left - originX : originBottom - bottom;
    const localEnd = horizontal ? right - originX : originBottom - top;

    const firstVisible = this.#findFirstVisiblePosition(positions, localStart);

    if (firstVisible === positions.length || positions[firstVisible]!.position >= localEnd) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();

    for (let i = firstVisible; i < positions.length; i++) {
      const { index, position } = positions[i]!;

      if (position >= localEnd) {
        break;
      }

      const playback = this.#playbacks[index]!;

      if (position + (horizontal ? playback.animation.maxWidth : playback.animation.maxHeight) * this.effects.scale <= localStart) {
        continue;
      }

      const image = playback.animation.getSpriteFrame(playback.frameIndex, this.effects);

      const x = horizontal ? originX + position : originX;
      const y = horizontal ? originBottom - image.height : originBottom - position - image.height;

      ctx.drawImage(image, x, y);
    }

    ctx.restore();
  }

  #getTileSize(axis: "w" | "h", fallback: number): number {
    const bbox = this.bbox;

    if (bbox == null) {
      return fallback;
    }

    const min = bbox[axis === "w" ? 0 : 1];
    const max = bbox[axis === "w" ? 2 : 3];

    return Number.isFinite(min) && Number.isFinite(max) ? Math.max(1, max - min) : fallback;
  }

  #findFirstVisiblePosition(positions: readonly FlowPosition[], start: number): number {
    let from = 0;
    let to = positions.length;

    while (from < to) {
      const middle = (from + to) >>> 1;

      if (positions[middle]!.position < start - this.#maxSize) {
        from = middle + 1;

      } else {
        to = middle;
      }
    }

    return from;
  }
}
