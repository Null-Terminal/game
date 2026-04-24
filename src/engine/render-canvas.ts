import { cache } from "#decorators/cache";

export type RedrawHandler = (now: number, ctx: CanvasRenderingContext2D) => void;

export class RenderCanvas {
  canvas: HTMLCanvasElement;

  #paused = false;

  #redrawHandlers = new Set<RedrawHandler>();

  #redrawId = 0;

  @cache
  get #ctx() {
    return this.canvas.getContext("2d")!;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.start();
  }

  destroy() {
    this.stop();
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
      this.#redrawHandlers.forEach((handler) => handler(now, this.#ctx));
    };

    animate();
  }

  stop() {
    cancelAnimationFrame(this.#redrawId);
  }

  requestRedrawHandler(handler: RedrawHandler) {
    this.#redrawHandlers.add(handler);
    return () => this.#redrawHandlers.delete(handler);
  }

  clear() {
    this.#ctx.fillStyle = "RGBA(255, 255, 255, 1)";
    this.#ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export const renderCanvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement);
