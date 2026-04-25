import { cache } from "#decorators/cache";
import { EventEmitter } from "#/event-emitter";

import { type RenderCanvas } from "#engine/render-canvas";
import type { GameObjectAnimations, GameObjectOptions } from "#engine/game-object/types";

export * from "#engine/game-object/types";

export class GameObject {
  static animations: GameObjectAnimations = {};

  readonly canvas: RenderCanvas;
  readonly options: Required<GameObjectOptions>;
  readonly emitter = new EventEmitter({});

  x: number;
  y: number;
  speed = 1;

  @cache
  get events() {
    return this.emitter.events;
  }

  @cache
  get animations() {
    return (this.constructor as typeof GameObject).animations;
  }

  get width() {
    return this.#width;
  }

  get height() {
    return this.#height;
  }

  #width = 0;
  #height = 0;

  #paused = false;
  #cancelRedrawHandler: Function | null = null;

  constructor(canvas: RenderCanvas, opts?: GameObjectOptions) {
    this.canvas = canvas;

    this.options = {
      x: 0,
      y: 0,
      speed: 1,
      ...opts
    };

    this.x = this.options.x;
    this.y = this.options.y;
    this.speed = this.options.speed;
  }

  destroy() {
    this.#cancelRedrawHandler?.();
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

  play(animationName: string) {
    const selectedAnimation = this.animations[animationName];

    if (selectedAnimation == null) {
      throw new Error(`Animation ${animationName} not found`);
    }

    const [image, animation] = selectedAnimation;

    let lastFrameTime = 0;
    let spriteIndex = 0;

    this.#cancelRedrawHandler?.();

    const { emitter, events } = this.canvas;

    this.#cancelRedrawHandler = emitter.on(events.redraw, ([now, ctx]) => {
      const sprite = animation.at(spriteIndex)!;

      this.#width = sprite.width;
      this.#height = sprite.height;

      ctx.drawImage(
        image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        this.x,
        this.y,
        sprite.width,
        sprite.height
      );

      if (!this.isPaused() && (now - lastFrameTime >= sprite.animationDelay / this.speed)) {
        spriteIndex = (spriteIndex + 1) % animation.length;
        lastFrameTime = now;
      }
    });
  }
}
