import { Destroyable } from "#lib/destroyable";
import type { RenderStrategy } from "#engine/rendering/types";

export class Canvas2DStrategy extends Destroyable implements RenderStrategy {
  readonly context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    super();

    const context = canvas.getContext("2d");

    if (context == null) {
      throw new Error("Canvas2D is unavailable");
    }

    this.context = context;
  }

}
