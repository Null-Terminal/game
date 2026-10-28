import type { GameObject } from "#engine/game-objects/game-object";
import type { ObjectRenderPayload } from "#engine/game-objects/types";

interface OutlineBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class GameObjectDebug {
  readonly #go: GameObject;

  constructor(gameObject: GameObject) {
    this.#go = gameObject;
  }

  draw({ ctx, x, y }: ObjectRenderPayload, bounds?: Readonly<OutlineBounds>) {
    const { width, height } = this.#go;
    const outline = this.#go.options.debug?.outline;

    if (!outline || Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(width) || Number.isNaN(height)) {
      return;
    }

    if (bounds != null) {
      this.#drawOutline(ctx, outline, bounds.left, bounds.top, bounds.right, bounds.bottom);
      return;
    }

    const { width: viewWidth, height: viewHeight } = this.#go.canvas.canvas;

    const left = Math.max(0, x);
    const right = Number.isFinite(width) ? Math.min(viewWidth, x + width) : viewWidth;
    const rawBottom = viewHeight - y;
    const top = Number.isFinite(height) ? Math.max(0, rawBottom - height) : 0;
    const bottom = Math.min(viewHeight, rawBottom);

    this.#drawOutline(ctx, outline, left, top, right, bottom);
  }

  #drawOutline(
    ctx: CanvasRenderingContext2D,
    outline: string | true,
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    if (left >= right || top >= bottom) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = typeof outline === "string" ? outline : "#00FFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.restore();
  }
}
