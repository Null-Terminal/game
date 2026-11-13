import { LoadedAnimation } from "#engine/animation";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";
import type { ObjectRenderPayload } from "#engine/game-objects/game-object/render";
import type { RenderContext } from "#engine/rendering";

export interface GameObjectDebugOptions {
  // Рамка объекта; строкой можно задать её цвет
  bounds?: boolean | string;

  // Подпись с типом, именем, анимацией и кадром
  label?: boolean;

  // Выводит сведения об объекте в консоль по клику
  inspect?: boolean;
}

export interface DebugBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DebugPart {
  bounds: Readonly<DebugBounds>;
  animation?: LoadedAnimation;
  frame?: number;
  name?: string;
  color?: string;
}

export class GameObjectDebug<T extends GameObject = GameObject> extends ServantObject<T> {
  protected readonly boundsColor: string = "#00FFFF";

  constructor(go: T) {
    super(go);
  }

  get enabled() {
    const { bounds, label, inspect } = this.go.options.debug ?? {};
    return Boolean(bounds || label || inspect);
  }

  draw(payload: ObjectRenderPayload, bounds?: Readonly<DebugBounds>) {
    const { ctx, x, y } = payload;
    const { width, height } = this.go;

    if (!this.enabled || Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(width) || Number.isNaN(height)) {
      return;
    }

    const { bounds: showBounds, label: showLabel, inspect } = this.go.options.debug ?? {};

    if (bounds != null) {
      this.#drawDebug(ctx, showBounds, showLabel, inspect, bounds.left, bounds.top, bounds.right, bounds.bottom, payload);
      return;
    }

    const { width: viewWidth, height: viewHeight } = this.go.canvas.canvas;

    const left = Math.max(0, x);
    const right = Number.isFinite(width) ? Math.min(viewWidth, x + width) : viewWidth;
    const rawBottom = viewHeight - y;
    const top = Number.isFinite(height) ? Math.max(0, rawBottom - height) : 0;
    const bottom = Math.min(viewHeight, rawBottom);

    this.#drawDebug(ctx, showBounds, showLabel, inspect, left, top, right, bottom, payload);
  }

  drawPart(payload: ObjectRenderPayload, part: DebugPart) {
    if (!this.enabled) {
      return;
    }

    const { bounds } = part;
    const { bounds: showBounds, label, inspect } = this.go.options.debug ?? {};

    this.#drawDebug(
      payload.ctx,
      showBounds,
      label,
      inspect,
      bounds.left,
      bounds.top,
      bounds.right,
      bounds.bottom,
      payload,
      part
    );
  }

  #drawDebug(
    ctx: RenderContext,
    bounds: boolean | string | undefined,
    label: boolean | undefined,
    inspect: boolean | undefined,
    left: number,
    top: number,
    right: number,
    bottom: number,
    payload: ObjectRenderPayload,
    part?: DebugPart
  ) {
    if (left >= right || top >= bottom) {
      return;
    }

    if (inspect) {
      const frame = this.#getFrameIndex(payload, part);

      this.go.canvas.inspector.record({
        go: this.go,
        left, top,
        right,
        bottom,
        frame,
        animation: part?.animation ?? this.go.nowPlaying,
        part: part?.name ?? null
      });
    }

    if (!bounds && !label) {
      return;
    }

    ctx.save();

    if (bounds) {
      ctx.strokeStyle = typeof bounds === "string" ? bounds : part?.color ?? this.boundsColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, right - left, bottom - top);
    }

    if (label) {
      this.#drawLabel(ctx, left, top, payload, part);
    }

    ctx.restore();
  }

  #drawLabel(
    ctx: RenderContext,
    left: number,
    top: number,
    payload: ObjectRenderPayload,
    part?: DebugPart
  ) {
    const { go } = this;

    const parts = [go.constructor.name];

    if (go.options.name) {
      parts.push(go.options.name);
    }

    if (part?.name) {
      parts.push(part.name);
    }

    const playing = part?.animation ?? go.nowPlaying;

    if (playing instanceof LoadedAnimation) {
      const name = playing.name || "animation";
      const frame = this.#getFrameIndex(payload, part);
      parts.push(typeof frame === "number" ? `${name} #${frame + 1}` : name);

    } else if (playing != null) {
      parts.push(playing.name || "procedural");
    }

    const label = parts.join(" · ");
    const labelTop = top >= 16 ? top - 16 : top + 2;

    ctx.font = "12px monospace";
    ctx.fillStyle = "#000000";
    ctx.fillRect(left, labelTop, ctx.measureText(label).width + 6, 15);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, left + 3, labelTop + 12);
  }

  #getFrameIndex(
    payload: ObjectRenderPayload,
    part?: DebugPart
  ): number | null {
    if (part != null) {
      return part.frame ?? null;
    }

    if (!(this.go.nowPlaying instanceof LoadedAnimation)) {
      return null;
    }

    if ("frameIndex" in payload && typeof payload.frameIndex === "number") {
      return payload.frameIndex;
    }

    return null;
  }
}
