import type { RenderStrategy } from "#engine/rendering/types";

export class Canvas2DStrategy implements RenderStrategy {
  readonly context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (context == null) {
      throw new Error("Canvas2D is unavailable");
    }

    this.context = context;
  }

  destroy() {}
}
