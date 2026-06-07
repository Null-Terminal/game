import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { RenderCanvasOptions, RenderPayload } from "#engine/game/render-canvas/types";

export * from "#engine/game/render-canvas/types";

export class RenderCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly options: Required<RenderCanvasOptions>;

  readonly emitter = new EventEmitter({
    background: handler<RenderPayload>(),
    static: handler<RenderPayload>(),
    dynamic: handler<RenderPayload>(),
    main: handler<RenderPayload>(),
    overlay: handler<RenderPayload>()
  });

  @cache
  get events() {
    return this.emitter.events;
  }

  get fps() {
    return this.#fps;
  }

  @cache
  get #ctx() {
    return this.canvas.getContext("2d")!;
  }

  #paused = false;
  #redrawId = 0;

  #fps = 0;
  #frameCount = 0;
  #lastFpsUpdate = 0;

  constructor(canvas: HTMLCanvasElement, opts?: RenderCanvasOptions) {
    this.canvas = canvas;
    this.options = {
      backgroundColor: "#FFF",
      width: 1024,
      height: 768,
      showFPS: false,
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

  switchFPS(show: boolean = true) {
    this.options.showFPS = show;
  }

  start() {
    this.stop();

    this.#lastFpsUpdate = performance.now();
    this.#frameCount = 0;

    const animate = (now?: number) => {
      this.#redrawId = requestAnimationFrame(animate);

      if (now == null || this.isPaused()) {
        return;
      }

      // Обновляем FPS
      this.#frameCount++;
      const elapsed = now - this.#lastFpsUpdate;

      if (elapsed >= 1000) {
        this.#fps = Math.round((this.#frameCount * 1000) / elapsed);
        this.#frameCount = 0;
        this.#lastFpsUpdate = now;
      }

      this.clear();

      const payload: RenderPayload = [now, this.#ctx];

      this.emitter.emit(this.events.background, payload);
      this.emitter.emit(this.events.static, payload);
      this.emitter.emit(this.events.dynamic, payload);
      this.emitter.emit(this.events.main, payload);
      this.emitter.emit(this.events.overlay, payload);

      if (this.options.showFPS) {
        this.drawFPS();
      }
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

  protected drawFPS() {
    this.#ctx.font = "16px monospace";
    this.#ctx.fillStyle = "#00FF00";
    this.#ctx.shadowBlur = 0;
    this.#ctx.fillText(`FPS: ${this.#fps}`, 10, 30);
  }
}
