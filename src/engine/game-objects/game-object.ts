import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game } from "#engine/game";
import type { BakedFrame } from "#engine/animation-loader";
import type { PoolPointer } from "#engine/game-object-pool";
import type { BBoxTuple } from "#engine/rtree";

import { KindedObject } from "#engine/game-objects/kinded-object";
import { Movement } from "#engine/game-objects/movement";

import type { Animations, AnimationEvents } from "#engine/game-objects/types";
import type { Composition, CompositionInstances, GameObjectOptions, Effects } from "#engine/game-objects/types";

export abstract class GameObject extends KindedObject {
  static readonly composition: Composition = {};
  readonly composition: CompositionInstances<(typeof GameObject)["composition"]> = {};

  static readonly animations: Animations = {};
  readonly animations = GameObject.animations;

  @cache
  static get animationEntries() {
    const entries = Object.entries(this.animations);
    entries.forEach(([name, value]) => value.name = name);
    return entries;
  }

  readonly animation: EventEmitter<AnimationEvents<this["animations"]>> = new EventEmitter({
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

  get nowPlaying(): Animations[keyof Animations] | null {
    return this.#nowPlaying;
  }

  get width() {
    return this.#width;
  }

  get height() {
    return this.#height;
  }

  // Из‑за потери точности при работе с дробными числами иногда возникает эффект "парения в воздухе".
  // Это значение используется для визуальной фиксации отображаемого спрайта без реального изменения координат.
  protected correctionY = 0;

  protected set width(value: number) {
    this.#width = value;
  }

  protected set height(value: number) {
    this.#height = value;
  }

  #paused = false;

  #width = 0;
  #height = 0;

  #nowPlaying: Animations[keyof Animations] | null = null;
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

      if (isFinite(minX) && isFinite(maxX)) {
        this.width = maxX - minX;

      } else {
        this.width = Infinity;
        opts.stretchWidth = true;
      }

      if (isFinite(minY) && isFinite(maxY)) {
        this.height = maxY - minY;

      } else {
        this.height = Infinity;
        opts.stretchHeight = true;
      }

    } else {
      this.bbox = null;

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

      if (opts.show != null && opts.show in this.animations) {
        this.play(this.animations[opts.show]!);
      }

      if (opts.movement != null) {
        this.movement.moveAlongPath(opts.movement.path, opts.movement);
      }
    });

    const composition = Object.entries((this.constructor as typeof GameObject).composition);

    composition.forEach(([name, [go, opts]]) => {
      const resolvedOpts = { ...this.options, x: 0, y: 0, ...opts };

      if (opts != null) {
        if ("bbox" in opts && "bbox" in resolvedOpts) {
          const { bbox } = opts;
          resolvedOpts.bbox = [bbox[0] + this.x, bbox[1] + this.y, bbox[2] + this.x, bbox[3] + this.y];

        } else {
          resolvedOpts.x += this.x;
          resolvedOpts.y += this.y;
        }
      }

      this.composition[name] = game.world.objects.get(...game.world.createObject(go, resolvedOpts))!;
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

  ensurePlaying(animation: Animations[keyof Animations]) {
    if (this.#nowPlaying !== animation) {
      this.play(animation);
    }
  }

  play(animation: Animations[keyof Animations]) {
    const spriteAnimation = animation.animation;
    const params = spriteAnimation.params;

    let lastFrameTime = 0;
    let spriteIndex = params.randomOrder ? spriteAnimation.randomIndex() : 0;

    this.#cancelRedrawHandler?.();
    this.#nowPlaying = animation;

    const { bbox, effects, game: { camera } } = this;
    const { stretchWidth, stretchHeight, staticScreen } = this.options;
    const { canvas, emitter } = this.canvas;

    let rendered = false;

    // Для объекта без bbox фиксируем ширину и высоту по самому широкому спрайту
    if (bbox == null) {
      this.width = animation.maxWidth * effects.scale;
      this.height = animation.maxHeight * effects.scale;
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

    const renderAsPattern = bbox != null || stretchWidth || stretchHeight;

    this.#cancelRedrawHandler = this.register(emitter.on(this.redrawEvent, ({ now, ctx }) => {
      const sprite = spriteAnimation.at(spriteIndex)!;

      const { width: w, height: h } = this;

      let y = this.y - this.correctionY;
      let x = this.x;

      // Поддержка скроллинга
      if (!staticScreen) {
        x -= camera.x;
        y -= camera.y;
      }

      // Нормализуем y, так как canvas считает 0 верхом, а не низом
      y = canvas.height - y - h;

      if (renderAsPattern) {
        const image = animation.getPatternFrame(spriteIndex, w, h, effects);

        ctx.drawImage(image, 0, 0, w, h, x, y, w, h);

        // Для не статичных изображений нужно создавать реплики,
        // если нужно, чтобы оно растягивалось на весь экран
        this.#stretchPattern(ctx, image, x, y);

      } else {
        const image = animation.getSpriteFrame(spriteIndex, effects);

        // Центрируем спрайт по нижней границе, чтобы изображение "не висело" в воздухе
        // из-за разницы высот между отдельным фреймом и максимальным
        const diffY = h - image.height;
        ctx.drawImage(image, x, y + diffY, image.width, image.height);
      }

      if ((!rendered || sprite.spriteId !== "") && animation.name in this.animation.events) {
        this.animation.emit(this.animation.events[animation.name]!, sprite.spriteId);
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
          spriteIndex = spriteAnimation.randomIndex();

        } else {
          if (params.loopReverse) {
            if (spriteIndex + inc === spriteAnimation.length) {
              inc = -1;

            } else if (spriteIndex + inc === -1) {
              inc = 1;
            }
          }

          spriteIndex = (spriteIndex + inc) % spriteAnimation.length;
        }

        lastFrameTime = now;
      }

      rendered = true;
    }));
  }

  #stretchPattern(ctx: CanvasRenderingContext2D, pattern: BakedFrame, x: number, y: number) {
    const opts = this.options;

    if (opts.staticScreen) {
      return;
    }

    const { game, width: w, height: h } = this;

    if (opts.stretchWidth) {
      if (Math.abs(x) >= w) {
        this.x = game.camera.x;
      }

      if (x != 0) {
        x = x + w * Math.sign(x * -1);
        ctx.drawImage(pattern, 0, 0, w, h, x, y, w, h);
      }
    }

    if (opts.stretchHeight) {
      if (Math.abs(y) <= h) {
        this.y = game.camera.y;
      }

      if (y != 0) {
        y = y + h * Math.sign(y * -1);
        ctx.drawImage(pattern, 0, 0, w, h, x, y, w, h);
      }
    }
  }
}

