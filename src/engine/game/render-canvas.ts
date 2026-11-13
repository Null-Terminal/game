import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import { Disposable } from "#engine/disposable";
import { RenderCanvasInspector } from "#engine/game/render-canvas/inspector";
import { Canvas2DStrategy, WebGLStrategy, WebGLUnavailableError } from "#engine/rendering";

import type { RenderContext, RenderStrategy } from "#engine/rendering";
import type { RenderCanvasOptions, RenderPayload } from "#engine/game/render-canvas/types";

export type * from "#engine/game/render-canvas/types";

export class RenderCanvas extends Disposable {
  readonly canvas: HTMLCanvasElement;
  readonly options: Required<RenderCanvasOptions>;

  readonly emitter = new EventEmitter({
    beforeRender: handler<RenderPayload>({ ordered: true }),
    background: handler<RenderPayload>({ ordered: true }),
    scene: handler<RenderPayload>({ ordered: true, withFlush: true }),
    interact: handler<RenderPayload>({ ordered: true, withFlush: true }),
    main: handler<RenderPayload>({ ordered: true }),
    overlay: handler<RenderPayload>({ ordered: true }),
    ui: handler<RenderPayload>({ ordered: true }),
  });

  get paused() {
    return this.#paused;
  }

  @cache
  get events() {
    return this.emitter.events;
  }

  @cache
  get inspector() {
    return new RenderCanvasInspector(this);
  }

  get fps() {
    return this.#fps;
  }

  get delta() {
    return this.#delta;
  }

  get textureStats() {
    return this.#strategy.textureStats;
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

  readonly #ctx: RenderContext;
  readonly #strategy: RenderStrategy;

  #redrawId = 0;
  #paused = false;

  #fps = 0;
  #delta = 0;

  constructor(canvas: HTMLCanvasElement, opts?: RenderCanvasOptions) {
    super();

    this.canvas = canvas;
    this.options = {
      backgroundColor: "#FFF",
      width: 1024,
      height: 768,
      showFPS: false,
      backend: "webgl",
      ...opts
    };

    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;

    let strategy: RenderStrategy | null = null;

    if (this.options.backend === "webgl") {
      try {
        strategy = new WebGLStrategy(this.canvas);

      } catch (err) {
        if (!(err instanceof WebGLUnavailableError)) {
          throw err;
        }
      }
    }

    this.#strategy = strategy ?? new Canvas2DStrategy(this.canvas);
    this.#ctx = this.#strategy.context;

    this.start();
  }

  override destroy() {
    super.destroy();
    this.stop();
    this.emitter.off();
    this.#strategy.destroy();
  }

  pause() {
    this.#paused = true;
  }

  resume() {
    this.#paused = false;
  }

  togglePause() {
    if (this.paused) {
      this.resume();

    } else {
      this.pause();
    }
  }

  switchFPS(show: boolean = true) {
    this.options.showFPS = show;
  }

  start() {
    this.stop();

    let lastRedraw = performance.now();
    let lastFpsUpdate = lastRedraw;

    let frameCount = 0;

    const payload = {
      now: 0,
      delta: 0,
      ctx: this.#ctx
    };

    const animate = (now?: number) => {
      this.#redrawId = requestAnimationFrame(animate);

      if (now == null || this.paused) {
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

      this.#delta = Math.min(0.025, (now - lastRedraw) / 1000);
      payload.delta = this.#delta;

      lastRedraw = now;
      payload.now = now;

      this.emitter.emit(this.events.beforeRender, payload);
      this.emitter.emit(this.events.background, payload);
      this.emitter.emit(this.events.scene, payload);
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
