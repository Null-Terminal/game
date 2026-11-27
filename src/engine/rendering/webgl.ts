import { Destroyable } from "#lib/destroyable";
import { WebGLCanvasContext } from "#engine/rendering/webgl/context";
import type { RenderStrategy } from "#engine/rendering/types";

export { WebGLUnavailableError } from "#engine/rendering/webgl/context";

export class WebGLStrategy extends Destroyable implements RenderStrategy {
  readonly context: WebGLCanvasContext;

  get textureStats() {
    return this.context.textureStats;
  }

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.context = new WebGLCanvasContext(canvas);
    this.onDestroy(this.context);
  }
}
