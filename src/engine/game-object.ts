import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import { type RenderCanvas } from "#engine/render-canvas";
import type { Animations, AnimationEvents, GameObjectOptions } from "#engine/game-object/types";

export * from "#engine/game-object/types";

export abstract class GameObject {
  static animations: Animations = {};

  @cache
  static get animationEntries(){
    const entries = Object.entries(this.animations);

    entries.forEach(([name, value]) => {
      // Сохраняем имя связанного события
      if (!Object.hasOwn(value, "eventName")) {
        Object.defineProperty(value, "eventName", { value: name });
      }
    });

    return entries;
  }

  declare readonly Animations: (typeof GameObject)["animations"];

  readonly canvas: RenderCanvas;
  readonly options: Required<GameObjectOptions>;

  readonly animation: EventEmitter<AnimationEvents<this["Animations"]>> = new EventEmitter({
    ...(this.constructor as typeof GameObject).animationEntries.reduce((map, [name]) => {
      map[name] = handler<string>();
      return map;
    }, {} as any /* WTF TS? */)
  });

  x: number;
  y: number;

  speed: number;
  scale: number;

  @cache
  get animations(): this["Animations"] {
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
      scale: 1,
      ...opts
    };

    this.x = this.options.x;
    this.y = this.options.y;

    this.speed = this.options.speed;
    this.scale = this.options.scale;

    this.init();
  }

  abstract init(): void;

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

  play(selectedAnimation: Animations[keyof Animations]) {
    const [image, animation] = selectedAnimation;

    let lastFrameTime = 0;
    let spriteIndex = 0;

    this.#cancelRedrawHandler?.();

    const { emitter, events } = this.canvas;

    let rendered = false;

    this.#cancelRedrawHandler = emitter.on(events.redraw, ([now, ctx]) => {
      const sprite = animation.at(spriteIndex)!;

      this.#width = sprite.width * this.scale;
      this.#height = sprite.height * this.scale;

      ctx.drawImage(
        image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        this.x,
        this.y,
        this.#width,
        this.#height,
      );

      const animationName = selectedAnimation.eventName!;

      if ((!rendered || sprite.spriteId !== "") && animationName in this.animation.events) {
        this.animation.emit(this.animation.events[animationName]!, sprite.spriteId);
      }

      if (!this.isPaused() && (now - lastFrameTime >= sprite.animationDelay / this.speed)) {
        spriteIndex = (spriteIndex + 1) % animation.length;
        lastFrameTime = now;
      }

      rendered = true;
    });
  }
}
