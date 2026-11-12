import { WebGLCanvasContext } from "#engine/rendering/webgl/context";
import type { RenderStrategy } from "#engine/rendering/types";

export { WebGLUnavailableError } from "#engine/rendering/webgl/context";

export class WebGLStrategy implements RenderStrategy {
  readonly context: WebGLCanvasContext;

  get textureStats() {
    return this.context.textureStats;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.context = new WebGLCanvasContext(canvas);
  }

  destroy() {
    this.context.destroy();
  }
}
