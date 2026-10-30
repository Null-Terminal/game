import { ifAlive } from "#engine/game-objects/decorators";
import { GameObjectServant } from "#engine/game-objects/servant";

import type { Handler, Handlers } from "#/event-emitter";
import type { GameObject } from "#engine/game-objects/game-object";
import type { ObjectRenderPayload, PlayableAnimation } from "#engine/game-objects/game-object/types";

export class GameObjectRender extends GameObjectServant {
  readonly #payload: ObjectRenderPayload;
  readonly #listeners = new Set<() => void>();

  #stopRedraw: (() => void) | null = null;
  #playing: PlayableAnimation | null = null;

  constructor(go: GameObject) {
    super(go);

    this.#payload = {
      ctx: null as CanvasRenderingContext2D | null,
      now: 0,
      delta: 0,
      elapsed: 0,
      x: 0,
      y: 0,
      resolveY: (y: number) => go.canvas.canvas.height - y - go.height
    } as ObjectRenderPayload;
  }

  get nowPlaying(): PlayableAnimation | null {
    return this.#playing;
  }

  @ifAlive
  on<E extends Handlers>(event: E, listener: Handler<E["PayloadType"]>): () => void {
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
    draw: (payload: ObjectRenderPayload) => void,
    animation: PlayableAnimation | null = null,
    onStop?: () => void
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
      payload.x = go.x - go.game.camera.x;
      payload.y = go.y - go.game.camera.y - go.visualOffsetY;

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
