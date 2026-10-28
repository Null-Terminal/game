import type { Handler, Handlers } from "#/event-emitter";
import type { LoadedAnimation } from "#engine/animation-loader";
import type { GameObject } from "#engine/game-objects/game-object";
import type { ObjectRenderPayload } from "#engine/game-objects/types";

export class GameObjectRender {
  readonly #go: GameObject;

  readonly #payload: ObjectRenderPayload;
  readonly #listeners = new Set<() => void>();

  #stopRedraw: (() => void) | null = null;
  #playing: LoadedAnimation | null = null;

  constructor(gameObject: GameObject) {
    this.#go = gameObject;

    this.#payload = {
      ctx: null as CanvasRenderingContext2D | null,
      now: 0,
      delta: 0,
      x: 0,
      y: 0,
      resolveY: (y: number) => gameObject.canvas.canvas.height - y - gameObject.height
    } as ObjectRenderPayload;
  }

  get nowPlaying(): LoadedAnimation | null {
    return this.#playing;
  }

  on<E extends Handlers>(event: E, listener: Handler<E["PayloadType"]>): () => void {
    if (this.#go.destroyed) {
      throw new Error(`${this.#go.name}.render: called on destroyed object`);
    }

    const unsubscribe = this.#go.canvas.emitter.on(event, listener);

    const stop = () => {
      if (this.#listeners.delete(stop)) {
        unsubscribe();
      }
    };

    this.#listeners.add(stop);
    return stop;
  }

  onRedraw(draw: (payload: ObjectRenderPayload) => void, animation: LoadedAnimation | null = null) {
    if (this.#go.destroyed) {
      throw new Error(`${this.#go.name}.render: called on destroyed object`);
    }

    this.#stopRedraw?.();
    this.#playing = animation;

    const go = this.#go;
    const payload = this.#payload;

    this.#stopRedraw = this.on(go.redrawEvent, (frame) => {
      if (go.status.shadowed) {
        return;
      }

      payload.ctx = frame.ctx;
      payload.now = frame.now;
      payload.delta = frame.delta;
      payload.x = go.x - go.game.camera.x;
      payload.y = go.y - go.game.camera.y - go.visualOffsetY;

      draw(payload);
    });
  }

  clear() {
    for (const stop of this.#listeners) {
      stop();
    }

    this.#stopRedraw = null;
    this.#playing = null;
  }
}
