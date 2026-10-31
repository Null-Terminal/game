import type { Handler, Handlers } from "#/event-emitter";

import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { GameObject } from "#engine/game-objects/game-object";
import type { PlayableAnimation } from "#engine/game-objects/game-object/types";
import type * as t from "#engine/game-objects/game-object/render/types";

export type * from "#engine/game-objects/game-object/render/types";

export class GameObjectRender<T extends GameObject = GameObject> extends ServantObject<T> {
  readonly #payload: t.ObjectRenderPayload;
  readonly #listeners = new Set<Destructor>();

  #originX = 0;
  #originY = 0;
  #cameraX = 0;
  #cameraY = 0;

  #stopRedraw: Destructor | null = null;
  #playing: PlayableAnimation | null = null;

  constructor(go: T) {
    super(go);

    this.#payload = {
      ctx: null as CanvasRenderingContext2D | null,
      now: 0,

      delta: 0,
      elapsed: 0,

      x: 0,
      y: 0,

      getScrollOffsetX: (factor = 1) => factor === 1 ? Math.round(this.#cameraX) : this.#cameraX * factor,
      getScrollOffsetY: (factor = 1) => factor === 1 ? Math.round(this.#cameraY) : this.#cameraY * factor,

      getScreenX: (factor = 1) => this.#originX - this.#payload.getScrollOffsetX(factor),
      getScreenY: (factor = 1) => this.#originY - this.#payload.getScrollOffsetY(factor),

      toCanvasTop: (y: number) => go.canvas.canvas.height - y - go.height
    } as t.ObjectRenderPayload;
  }

  get nowPlaying(): PlayableAnimation | null {
    return this.#playing;
  }

  isVisibleInViewport(left: number, top: number, right: number, bottom: number): boolean {
    const { width, height } = this.go.canvas.canvas;
    return left < right && top < bottom && left < width && right > 0 && top < height && bottom > 0;
  }

  drawBitmap(payload: t.BitmapRenderPayload, defaultRender: t.BitmapRenderFrame) {
    defaultRender(payload);
  }

  @ifAlive
  on<E extends Handlers>(event: E, listener: Handler<E["PayloadType"]>): Destructor {
    const unsubscribe = this.go.canvas.emitter.on(event, listener);

    const stop = () => {
      if (this.#listeners.delete(stop)) {
        unsubscribe();
      }
    };

    this.#listeners.add(stop);
    return stop;
  }

  @ifAlive
  onRedraw(
    draw: (payload: t.ObjectRenderPayload) => void,
    animation: PlayableAnimation | null = null,
    onStop?: Destructor
  ) {
    this.stopRedraw();
    this.#playing = animation;

    const go = this.go;

    const payload = this.#payload;
    payload.elapsed = 0;

    let lastNow = 0;

    const unsubscribe = this.on(go.redrawEvent, (frame) => {
      if (go.status.shadowed) {
        return;
      }

      if (lastNow !== 0 && !go.status.paused) {
        payload.elapsed += Math.max(0, frame.now - lastNow) * go.effects.speed;
      }

      lastNow = frame.now;

      payload.ctx = frame.ctx;
      payload.now = frame.now;
      payload.delta = frame.delta;

      this.#originX = go.x;
      this.#originY = go.y - go.visualOffsetY;
      this.#cameraX = go.game.camera.x;
      this.#cameraY = go.game.camera.y;

      payload.x = payload.getScreenX();
      payload.y = payload.getScreenY();

      draw(payload);
    });

    this.#stopRedraw = () => {
      unsubscribe();
      onStop?.();
    };
  }

  stopRedraw() {
    const stop = this.#stopRedraw;
    this.#stopRedraw = null;
    this.#playing = null;
    stop?.();
  }

  clear() {
    this.stopRedraw();

    for (const stop of this.#listeners) {
      stop();
    }
  }
}
