import { BackgroundObjectRender } from "#engine/game-objects/background-object/render";

import type { ObjectRenderPayload } from "#engine/game-objects/game-object";
import type { AnimationPlayback } from "#engine/game-objects/game-object/animation-playback";

import type { BackgroundFlowObject } from "#engine/game-objects/background-flow-object";
import type { FlowLayout, FlowPosition } from "#engine/game-objects/background-flow-object/layout";
import type { BackgroundFlowDirection } from "#engine/game-objects/background-flow-object/types";

export interface BackgroundFlowRenderState {
  layout: FlowLayout;
  playbacks: AnimationPlayback[];
  direction: BackgroundFlowDirection;
  maxSize: number;
}

export class BackgroundFlowObjectRender extends BackgroundObjectRender<BackgroundFlowObject> {
  drawComposition(frame: ObjectRenderPayload, state: BackgroundFlowRenderState) {
    const { go } = this;

    const factorX = this.getScrollFactor("w");
    const factorY = this.getScrollFactor("h");

    const scrollX = frame.getScrollOffsetX(factorX);
    const scrollY = frame.getScrollOffsetY(factorY);

    go.syncSize();

    frame.x = frame.getScreenX(factorX);
    frame.y = frame.getScreenY(factorY);

    const bounds = this.getVisibleBounds(frame);

    if (bounds == null) {
      return;
    }

    const { width: viewWidth, height: viewHeight } = go.canvas.canvas;

    const stretchWidth = go.options.stretch?.includes("w") ?? false;
    const stretchHeight = go.options.stretch?.includes("h") ?? false;

    const wrapWidth = stretchWidth && !go.options.static?.includes("w");
    const wrapHeight = stretchHeight && !go.options.static?.includes("h");

    const tileWidth = stretchWidth ? this.#getTileSize("w", viewWidth) : Infinity;
    const tileHeight = stretchHeight ? this.#getTileSize("h", viewHeight) : Infinity;

    const originX = Number.isFinite(frame.x) ? frame.x : -scrollX;
    const originBottom = Number.isFinite(frame.y) ? viewHeight - frame.y : viewHeight + scrollY;

    const horizontal = state.direction === "horizontal";
    const layoutEnd = horizontal ?
      (stretchWidth ? tileWidth : bounds.right - originX) :
      (stretchHeight ? tileHeight : originBottom - bounds.top);

    if (layoutEnd > 0) {
      state.layout.extendTo(layoutEnd);
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
        this.#drawTile(frame.ctx, state, tileX, tileBottom, left, top, right, bottom);

        if (go.options.debug?.stretchSeams) {
          go.debug.drawStretchSeams(frame.ctx, {
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
  }

  #drawTile(
    ctx: CanvasRenderingContext2D,
    state: BackgroundFlowRenderState,
    originX: number,
    originBottom: number,
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    const { playbacks, direction, maxSize } = state;
    const positions = state.layout.positions;
    const horizontal = direction === "horizontal";
    const localStart = horizontal ? left - originX : originBottom - bottom;
    const localEnd = horizontal ? right - originX : originBottom - top;
    const firstVisible = this.#findFirstVisiblePosition(positions, localStart, maxSize);

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

      const playback = playbacks[index]!;

      if (position + (horizontal ? playback.animation.maxWidth : playback.animation.maxHeight) * this.go.effects.scale <= localStart) {
        continue;
      }

      const image = playback.animation.getSpriteFrame(playback.frameIndex, this.go.effects);
      const x = horizontal ? originX + position : originX;
      const y = horizontal ? originBottom - image.height : originBottom - position - image.height;

      ctx.drawImage(image, x, y);
    }

    ctx.restore();
  }

  #getTileSize(axis: "w" | "h", fallback: number): number {
    const { bbox } = this.go;

    if (bbox == null) {
      return fallback;
    }

    const min = bbox[axis === "w" ? 0 : 1];
    const max = bbox[axis === "w" ? 2 : 3];

    return Number.isFinite(min) && Number.isFinite(max) ? Math.max(1, max - min) : fallback;
  }

  #findFirstVisiblePosition(positions: readonly FlowPosition[], start: number, maxSize: number): number {
    let from = 0;
    let to = positions.length;

    while (from < to) {
      const middle = (from + to) >>> 1;

      if (positions[middle]!.position < start - maxSize) {
        from = middle + 1;

      } else {
        to = middle;
      }
    }

    return from;
  }
}
