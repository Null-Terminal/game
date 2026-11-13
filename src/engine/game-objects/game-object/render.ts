import type { Handlers } from "#/event-emitter";

import { AnimationLayer, LoadedAnimation } from "#engine/animation";
import { ifAlive } from "#engine/game-objects/decorators";
import { ServantObject } from "#engine/game-objects/servant-object";

import type { SpriteAnchorX, SpriteAnchorY } from "#engine/animation";
import type { RenderPayload } from "#engine/game";
import type { GameObject } from "#engine/game-objects/game-object";
import type { PlayableAnimation } from "#engine/game-objects/game-object/types";
import type * as t from "#engine/game-objects/game-object/render/types";
import type { RenderContext } from "#engine/rendering";

export type * from "#engine/game-objects/game-object/render/types";

export class GameObjectRender<T extends GameObject = GameObject> extends ServantObject<T> {
  readonly #payload: t.ObjectRenderPayload;
  readonly #listeners = new Set<Destructor>();

  #originX = 0;
  #originY = 0;
  #cameraX = 0;
  #cameraY = 0;
  #visualOffsetY = 0;

  #redraw: ((payload: t.ObjectRenderPayload) => void) | null = null;
  #redrawSubscription: Destructor | null = null;
  #redrawElapsedStart: number | null = null;
  #onRedrawStop: Destructor | null = null;
  #playing: PlayableAnimation | null = null;

  constructor(go: T) {
    super(go);

    this.#payload = {
      ctx: null as RenderContext | null,
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

  drawBitmap(payload: t.BitmapRenderPayload) {
    const { bbox, width, height, effects } = this.go;
    const { ctx, frameIndex, animation, x, y, toCanvasTop } = payload;

    const top = toCanvasTop(y);

    const finiteBounds =
      Number.isFinite(x) && Number.isFinite(top) &&
      Number.isFinite(width) && Number.isFinite(height);

    if (finiteBounds && !this.isVisibleInViewport(x, top, x + width, top + height)) {
      return;
    }

    if (bbox != null) {
      const image = animation.getPatternFrame(frameIndex, width, height, effects);
      ctx.drawImage(image, 0, 0, width, height, x, top, width, height);

    } else {
      const image = animation.getSpriteFrame(frameIndex, effects);
      ctx.drawImage(image, x, top + height - image.height, image.width, image.height);
    }
  }

  sprite(animation: LoadedAnimation, anchorX: SpriteAnchorX = "left", anchorY: SpriteAnchorY = "bottom") {
    return new AnimationLayer(animation, this.go.game.camera, this.go.effects, anchorX, anchorY);
  }

  setVisualOffsetY(offset: number) {
    this.#visualOffsetY = offset;
  }

  @ifAlive
  on<E extends Handlers<RenderPayload>>(
    event: E,
    listener: (payload: E["PayloadType"], elapsed: number) => void
  ): Destructor {
    const { go } = this;

    let elapsed = 0;
    let lastNow = 0;

    const handle = (frame: E["PayloadType"]) => {
      if (lastNow !== 0 && !go.status.paused) {
        elapsed += Math.max(0, frame.now - lastNow) * go.effects.speed;
      }

      lastNow = frame.now;
      listener(frame, elapsed);
    };

    const subscription = go.canvas.emitter.on(event, handle);
    const syncSubscription = (sleeping: boolean) => {
      if (sleeping) {
        subscription.sleep();
      } else {
        lastNow = 0;
        subscription.wake();
      }
    };

    const { emitter, events } = go.status;
    const statusSubscription = emitter.on(events.sleepChange, syncSubscription);
    syncSubscription(go.status.sleeping);

    const stop = () => {
      if (this.#listeners.delete(stop)) {
        statusSubscription.dispose();
        subscription.dispose();
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
    const { go } = this;

    this.stopRedraw();
    this.#playing = animation;
    this.#redraw = draw;
    this.#redrawElapsedStart = null;
    this.#onRedrawStop = onStop ?? null;

    const payload = this.#payload;
    this.#redrawSubscription ??= this.on(go.redrawEvent, (frame, elapsed) => {
      if (this.#redraw == null) {
        return;
      }

      payload.ctx = frame.ctx;
      payload.now = frame.now;
      payload.delta = frame.delta;
      this.#redrawElapsedStart ??= elapsed;
      payload.elapsed = elapsed - this.#redrawElapsedStart;

      const bitmap = this.#playing instanceof LoadedAnimation;

      this.#originX = go.x;
      this.#originY = go.y - this.#visualOffsetY;

      this.#cameraX = go.game.camera.x;
      this.#cameraY = go.game.camera.y;

      payload.x = bitmap ? Math.round(payload.getScreenX()) : payload.getScreenX();
      payload.y = bitmap ? Math.round(payload.getScreenY()) : payload.getScreenY();

      this.#redraw(payload);
    });
  }

  stopRedraw() {
    const onStop = this.#onRedrawStop;
    this.#onRedrawStop = null;
    this.#redraw = null;
    this.#redrawElapsedStart = null;
    this.#playing = null;
    onStop?.();
  }

  clear() {
    this.stopRedraw();
    this.#redrawSubscription?.();
    this.#redrawSubscription = null;
    this.#visualOffsetY = 0;

    for (const stop of this.#listeners) {
      stop();
    }
  }
}
