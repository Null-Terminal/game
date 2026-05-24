import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game } from "#engine/game";
import type { BBoxTuple } from "#engine/rtree";

import type { Animations, AnimationEvents, GameObjectOptions, Effects } from "#engine/game-object/types";

export * from "#engine/game-object/types";

const kinds = new Map<number, string>();

export abstract class GameObject {
  @cache
  static get kind() {
    const name = this.name;

    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0; // 32-битное усечение
    }

    hash = Math.abs(hash);

    if (kinds.has(hash)) {
      throw new Error(
        `Kind collision: "${name}" and "${kinds.get(hash)}" both have kind ${hash}`
      );
    }

    kinds.set(hash, name);

    return hash;
  }

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

  readonly animation: EventEmitter<AnimationEvents<this["Animations"]>> = new EventEmitter({
    ...(this.constructor as typeof GameObject).animationEntries.reduce((map, [name]) => {
      map[name] = handler<string>();
      return map;
    }, {} as any /* WTF TS? */)
  });

  game!: Game;

  options!: GameObjectOptions;
  effects!: Effects & Required<Pick<Effects, "speed" | "scale">>;

  x = 0;
  y = 0;
  bbox: BBoxTuple | null = null;

  get canvas() {
    return this.game.canvas;
  }

  get world() {
    return this.game.world;
  }

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
  #activeAnimation: Animations[keyof Animations] | null = null;
  #cancelRedrawHandler: Function | null = null;

  constructor(game: Game, opts?: GameObjectOptions) {
    this.create(game, opts);
  }

  abstract init(): void;

  create(game: Game, opts?: GameObjectOptions) {
    this.game = game;
    this.options = { ...opts };

    if ("bbox" in this.options) {
      this.bbox = this.options.bbox;
      this.x = this.bbox[0];
      this.y = this.bbox[1];

    } else {
      if ("x" in this.options) {
        this.x = this.options.x;
      }

      if ("y" in this.options) {
        this.y = this.options.y;
      }
    }

    this.effects = { scale: 1, speed: 1, ...this.options.effects };
    this.init();
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

  ensurePlaying(selectedAnimation: Animations[keyof Animations]) {
    if (this.#activeAnimation !== selectedAnimation) {
      this.play(selectedAnimation);
    }
  }

  play(selectedAnimation: Animations[keyof Animations]) {
    const [image, animation, patterns = new Array(animation.length).fill(null)] = selectedAnimation;

    // Добавляем кэш для текстур-шаблонов (CanvasPattern)
    if (selectedAnimation.length === 2) {
      selectedAnimation.push(patterns);
    }

    let lastFrameTime = 0;
    let spriteIndex = 0;

    this.#cancelRedrawHandler?.();
    this.#activeAnimation = selectedAnimation;

    const { effects } = this;
    const { emitter, events } = this.canvas;

    let rendered = false;

    // Для bbox жестко фиксируем геометрию
    if (this.bbox != null) {
      const [minX, minY, maxX, maxY] = this.bbox;

      this.#width = maxX - minX;
      this.#height = maxY - minY;

    // Для объекта без bbox фиксируем ширину и высоту по самому широкому спрайту
    } else {
      let maxWidth = 0;
      let maxHeight = 0;

      for (const sprite of animation) {
        maxWidth = Math.max(maxWidth, sprite.width);
        maxHeight = Math.max(maxHeight, sprite.height);
      }

      this.#width = maxWidth * effects.scale;
      this.#height = maxHeight * effects.scale;
    }

    this.#cancelRedrawHandler = emitter.on(events.redraw, ([now, ctx]) => {
      ctx.save();

      const sprite = animation.at(spriteIndex)!;

      let spriteWidth = sprite.width;
      let spriteHeight = sprite.height;

      if (this.bbox != null) {
        if (patterns[spriteIndex] == null) {
          const canvas = new OffscreenCanvas(spriteWidth, spriteHeight);

          canvas.getContext("2d")!.drawImage(
            image,

            sprite.x,
            sprite.y,
            sprite.width,
            sprite.height,

            0,
            0,
            spriteWidth,
            spriteHeight
          );

          patterns[spriteIndex] = ctx.createPattern(canvas, "repeat");
        }

        ctx.fillStyle = patterns[spriteIndex];
        ctx.fillRect(this.x, this.y, this.width, this.height);

      } else {
        spriteWidth *= effects.scale;
        spriteHeight *= effects.scale;

        let x = this.x;
        let y = this.y;

        ctx.scale(effects.flipX ? -1 : 1, effects.flipY ? -1 : 1);

        if (effects.flipX) {
          x = -x - spriteWidth;
        }

        if (effects.flipY) {
          y = -y - spriteHeight;
        }

        ctx.drawImage(
          image,

          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,

          x,
          y,
          spriteWidth,
          spriteHeight
        );
      }

      ctx.restore();

      const animationName = selectedAnimation.eventName!;

      if ((!rendered || sprite.spriteId !== "") && animationName in this.animation.events) {
        this.animation.emit(this.animation.events[animationName]!, sprite.spriteId);
      }

      if (!this.isPaused() && (now - lastFrameTime >= sprite.animationDelay / effects.speed)) {
        spriteIndex = (spriteIndex + 1) % animation.length;
        lastFrameTime = now;
      }

      rendered = true;
    });
  }
}
