import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import { Disposable } from "#engine/disposable";
import type { RenderCanvasOptions, RenderPayload } from "#engine/game/render-canvas/types";

export * from "#engine/game/render-canvas/types";

export class RenderCanvas extends Disposable {
  readonly canvas: HTMLCanvasElement;
  readonly options: Required<RenderCanvasOptions>;

  readonly emitter = new EventEmitter({
    background: handler<RenderPayload>(),
    static: handler<RenderPayload>(),
    dynamic: handler<RenderPayload>(),
    interact: handler<RenderPayload>(),
    main: handler<RenderPayload>(),
    overlay: handler<RenderPayload>(),
    ui: handler<RenderPayload>(),
  });

  @cache
  get events() {
    return this.emitter.events;
  }

  get fps() {
    return this.#fps;
  }

  get width() {
    return this.canvas.width;
  }

  set width(value: number) {
    this.canvas.width = value;
  }

  get height() {
    return this.canvas.height;
  }

  set height(value: number) {
    this.canvas.height = value;
  }

  @cache
  get #ctx() {
    return this.canvas.getContext("2d")!;
  }

  #redrawId = 0;
  #paused = false;
  #fps = 0;

  constructor(canvas: HTMLCanvasElement, opts?: RenderCanvasOptions) {
    super();

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

  override destroy() {
    super.destroy();
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

    let lastRedraw = performance.now();
    let lastFpsUpdate = lastRedraw;

    let frameCount = 0;

    const animate = (now?: number) => {
      this.#redrawId = requestAnimationFrame(animate);

      if (now == null || this.isPaused()) {
        return;
      }

      // Обновляем FPS
      frameCount++;
      const elapsed = now - lastFpsUpdate;

      if (elapsed >= 1000) {
        this.#fps = Math.round((frameCount * 1000) / elapsed);
        frameCount = 0;
        lastFpsUpdate = now;
      }

      this.clear();

      const delta = Math.min(0.025, (now - lastRedraw) / 1000);
      lastRedraw = now;

      const payload: RenderPayload = {
        now,
        delta,
        ctx: this.#ctx
      };

      this.emitter.emit(this.events.background, payload);
      this.emitter.emit(this.events.static, payload);
      this.emitter.emit(this.events.dynamic, payload);
      this.emitter.emit(this.events.interact, payload);
      this.emitter.emit(this.events.main, payload);
      this.emitter.emit(this.events.overlay, payload);
      this.emitter.emit(this.events.ui, payload);

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
    this.#ctx.fillText(`FPS: ${this.#fps}`, 10, 30);
  }
}
