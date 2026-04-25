import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { RenderCanvasOptions } from "#engine/render-canvas/types";

export * from "#engine/render-canvas/types";

export class RenderCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly options: Required<RenderCanvasOptions>;

  readonly emitter = new EventEmitter({
    redraw: handler<[now: number, ctx: CanvasRenderingContext2D]>()
  });

  @cache
  get events() {
    return this.emitter.events;
  }

  #paused = false;
  #redrawId = 0;

  @cache
  get #ctx() {
    return this.canvas.getContext("2d")!;
  }

  constructor(canvas: HTMLCanvasElement, opts?: RenderCanvasOptions) {
    this.canvas = canvas;
    this.options = {
      backgroundColor: "#FFF",
      width: 1024,
      height: 768,
      ...opts
    };

    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;

    this.start();
  }

  destroy() {
    this.stop();
    this.emitter.off();
  }

  isPaused() {
    return this.#paused;
  }

  pause() {
    this.#paused = true;
  }

  resume() {
    this.#paused = false;
  }

  start() {
    this.stop();

    const animate = (now?: number) => {
      this.#redrawId = requestAnimationFrame(animate);

      if (now == null || this.isPaused()) {
        return;
      }

      this.clear();
      this.emitter.emit(this.events.redraw, [now, this.#ctx]);
    };

    animate();
  }

  stop() {
    cancelAnimationFrame(this.#redrawId);
  }

  clear() {
    this.#ctx.fillStyle = this.options.backgroundColor;
    this.#ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export const renderCanvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement);
