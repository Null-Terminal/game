import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { BBoxTuple } from "#engine/rtree";

import { KindedObject } from "#engine/game-object/kinded-object";
import { Movement } from "#engine/game-object/movement";

import type { Animations, AnimationEvents, GameObjectOptions, Effects } from "#engine/game-object/types";

export abstract class GameObject extends KindedObject {
  static animations: Animations = {};

  @cache
  static get animationEntries(){
    const entries = Object.entries(this.animations);
    entries.forEach(([name, value]) => value.name = name);
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
  poolPointer!: PoolPointer;

  options!: GameObjectOptions;
  effects!: Effects & Required<Pick<Effects, "speed" | "scale">>;

  x = 0;
  prevX = 0;

  y = 0;
  prevY = 0;

  bbox: BBoxTuple | null = null;

  readonly movement = new Movement(this);

  get canvas() {
    return this.game.canvas;
  }

  get redrawEvent() {
    return this.game.canvas.events.main;
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

  protected set width(value: number) {
    this.#width = value;
  }

  protected set height(value: number) {
    this.#height = value;
  }

  #width = 0;
  #height = 0;

  #paused = false;
  #activeAnimation: Animations[keyof Animations] | null = null;

  #cancelRedrawHandler: Function | null = null;

  constructor(game: Game, poolPointer: PoolPointer, opts?: GameObjectOptions) {
    super();
    this.create(game, poolPointer, opts);
  }

  abstract init(): void;

  create(game: Game, poolPointer: PoolPointer, opts?: GameObjectOptions) {
    this.game = game;
    this.poolPointer = poolPointer;

    opts = { ...opts };
    this.options = opts;

    if ("bbox" in opts) {
      this.bbox = opts.bbox;
      const [minX, minY, maxX, maxY] = this.bbox;

      this.x = minX;
      this.y = minY;

      this.width = maxX - minX;
      this.height = maxY - minY;

    } else {
      if ("x" in opts) {
        this.x = opts.x;
      }

      if ("y" in opts) {
        this.y = opts.y;
      }
    }

    this.prevX = this.x;
    this.prevY = this.y;

    this.effects = { scale: 1, speed: 1, ...opts.effects };

    this.nextTick(() => {
      this.init();

      if (opts.animation != null && opts.animation in this.animations) {
        this.play(this.animations[opts.animation]!);
      }

      if (opts.movement != null) {
        this.movement.moveAlongPath(opts.movement.path, opts.movement);
      }
    });
  }

  move(dx: number, dy: number) {
    this.prevX = this.x;
    this.prevY = this.y;

    this.x = this.x + dx;
    this.y = this.y + dy;
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
    const { animation, animation: { params } } = selectedAnimation;

    let lastFrameTime = 0;
    let spriteIndex = params.randomOrder ? animation.randomIndex() : 0;

    this.#cancelRedrawHandler?.();
    this.#activeAnimation = selectedAnimation;

    const { effects, options: { stretchWidth, stretchHeight } } = this;
    const { canvas, emitter } = this.canvas;

    let rendered = false;

    // Для объекта без bbox фиксируем ширину и высоту по самому широкому спрайту
    if (this.bbox == null) {
      this.width = selectedAnimation.maxWidth * effects.scale;
      this.height = selectedAnimation.maxHeight * effects.scale;
    }

    if (stretchWidth || stretchHeight) {
      if (stretchWidth) {
        this.width = canvas.width;
      }

      if (stretchHeight) {
        this.height = canvas.height;
      }
    }

    let inc = 1;

    this.#cancelRedrawHandler = this.register(emitter.on(this.redrawEvent, ([now, ctx]) => {
      const sprite = animation.at(spriteIndex)!;

      // Нормализуем y, так как canvas считает 0 верхом, а не низом
      const y = canvas.height - this.y - this.height;

      if (this.bbox != null || stretchWidth || stretchHeight) {
        const image = selectedAnimation.getPatternFrame(spriteIndex, this.width, this.height, effects);
        ctx.drawImage(image, 0, 0, this.width, this.height, this.x, y, this.width, this.height);

      } else {
        const image = selectedAnimation.getSpriteFrame(spriteIndex, effects);

        // Центрируем спрайт по нижней границе, чтобы изображение "не висело" в воздухе
        // из-за разницы высот между отдельным фреймом и максимальным
        const diffY = this.height - image.height;
        ctx.drawImage(image, this.x, y + diffY, image.width, image.height);
      }

      if ((!rendered || sprite.spriteId !== "") && selectedAnimation.name in this.animation.events) {
        this.animation.emit(this.animation.events[selectedAnimation.name]!, sprite.spriteId);
      }

      let duration;

      if (params.randomDuration != null) {
        const max = params.randomDuration[0] ?? 100;
        const min = params.randomDuration[1] ?? 100;
        duration = Math.floor(Math.random() * (max - min + 1)) + min;

      } else {
        duration = sprite?.duration;
      }

      duration /= (params.speed * effects.speed);

      if (!this.isPaused() && (now - lastFrameTime >= duration)) {
        if (params.randomOrder) {
          spriteIndex = animation.randomIndex();

        } else {
          if (params.loopReverse) {
            if (spriteIndex + inc === animation.length) {
              inc = -1;

            } else if (spriteIndex + inc === -1) {
              inc = 1;
            }
          }

          spriteIndex = (spriteIndex + inc) % animation.length;
        }

        lastFrameTime = now;
      }

      rendered = true;
    }));
  }
}

