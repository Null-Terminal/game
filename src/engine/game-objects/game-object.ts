import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game, WorldObject } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { BBoxTuple } from "#engine/rtree";

import { ifAlive, ifShadowed } from "#engine/game-objects/decorators";
import { KindedObject } from "#engine/game-objects/kinded-object";

import { Movement } from "#engine/game-objects/movement";
import { GameObjectStatus } from "#engine/game-objects/game-object-status";

import type { Animations, AnimationEvents } from "#engine/game-objects/types";
import type { RenderFrame, RenderFramePayload } from "#engine/game-objects/types";
import type { OptionsOf, Accept, Refs, GameObjectOptions, Effects } from "#engine/game-objects/types";

export abstract class GameObject<T extends GameObjectOptions = GameObjectOptions> extends KindedObject {
  static refs<const T extends Accept>(entries: {
    [I in keyof T]: T[I] extends [
        infer C extends new (...args: any[]) => GameObject,
        ...any
      ]
      ? [C, OptionsOf<C>?]
      : T[I]
  }): T {
    return entries as T;
  }

  static readonly with: Accept = {};

  readonly refs: Refs<(typeof GameObject)["with"]> = {};

  acceptor: GameObject | null = null;

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

  options!: T;
  effects!: Effects & Required<Pick<Effects, "speed" | "scale">>;

  x = 0;
  prevX = 0;

  y = 0;
  prevY = 0;

  bbox: BBoxTuple | null = null;

  readonly movement = new Movement(this);

  statusValue = GameObjectStatus.State.Active;
  readonly status = new GameObjectStatus(this);

  get name(): string {
    return this.constructor.name;
  }

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
  protected visualOffsetY = 0;

  protected set width(value: number) {
    this.#width = value;
  }

  protected set height(value: number) {
    this.#height = value;
  }

  #width = 0;
  #height = 0;

  #nowPlaying: Animations[keyof Animations] | null = null;
  #cancelRedrawHandler: Function | null = null;

  // Конструктор не инициализирует экземпляр объекта, для этого нужно вызвать create
  constructor() {
    super();
    this.destroyed = true;
  }

  abstract init(): void;

  override destroy() {
    if (this.destroyed) {
      return;
    }

    super.destroy();

    this.status.reset();
    this.#nowPlaying = null;
  }

  reindex(index: number) {
    this.poolPointer = [this.poolPointer[0], index];
  }

  create(game: Game, poolPointer: PoolPointer, opts?: T): T {
    if (!this.destroyed) {
      throw new Error(`${this.constructor.name}.create: called on a live object`);
    }

    this.destroyed = false;
    this.status.reset();

    this.game = game;
    this.poolPointer = poolPointer;

    opts = { ...opts! };
    this.options = opts;

    if ("bbox" in opts!) {
      this.bbox = opts.bbox;
      const [minX, minY, maxX, maxY] = this.bbox;

      this.x = minX;
      this.y = minY;

      if (isFinite(minX) && isFinite(maxX)) {
        this.width = maxX - minX;

      } else {
        this.width = Infinity;
      }

      if (isFinite(minY) && isFinite(maxY)) {
        this.height = maxY - minY;

      } else {
        this.height = Infinity;
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
    this.acceptor = opts.acceptor ?? null;

    const createRef = (name: string, go: WorldObject[0], opts: WorldObject[1]) => {
      const instance = game.world.objects.get(...game.world.createObject(go, opts))!;
      this.refs[name] = instance;

      this.onDestroy(() => {
        const [kind, index] = instance.poolPointer;
        game.world.objects.delete(kind, index);

        instance.acceptor = null;
        this.refs[name] = null;
      });
    };

    Object.entries((this.constructor as typeof GameObject).with).forEach(([name, [go, opts]]) => {
      const resolvedOpts = { ...this.options, x: 0, y: 0, ...opts, acceptor: this };

      if (opts != null) {
        if ("bbox" in opts && "bbox" in resolvedOpts) {
          const { bbox } = opts;
          resolvedOpts.bbox = [bbox[0] + this.x, bbox[1] + this.y, bbox[2] + this.x, bbox[3] + this.y];

        } else {
          resolvedOpts.x += this.x;
          resolvedOpts.y += this.y;
        }
      }

      createRef(name, go, resolvedOpts);
    });

    if (opts.accept != null) {
      Object.entries(opts.accept).forEach(([name, [go, opts]]) => {
        createRef(name, go, { ...opts, acceptor: this });
      });
    }

    this.init();

    if (opts.show != null && opts.show in this.animations) {
      this.play(this.animations[opts.show]!);
    }

    if (opts.movement != null) {
      this.movement.follow(opts.movement);
    }

    this.mountFlush();

    return opts;
  }

  @ifAlive
  visit(_go: GameObject) {
    // Ничего не делаю по умолчанию
  }

  @ifAlive
  @ifShadowed(0)
  move(dx: number, dy: number): number {
    const status = this.kinematicMove(dx, dy);
    this.onMove(status);
    return status;
  }

  @ifAlive
  ensurePlaying(animation: Animations[keyof Animations]) {
    if (this.#nowPlaying !== animation) {
      this.play(animation);
    }
  }

  @ifAlive
  play(animation: Animations[keyof Animations]) {
    const spriteAnimation = animation.animation;
    const params = spriteAnimation.params;

    let lastFrameTime = 0;
    let frameIndex = params.randomOrder ? spriteAnimation.randomIndex() : 0;

    this.#cancelRedrawHandler?.();
    this.#nowPlaying = animation;

    const { game: { camera }, canvas: { canvas, emitter }, bbox, effects } = this;

    // Для объекта без bbox фиксируем ширину и высоту по самому широкому спрайту
    if (bbox == null) {
      this.width = animation.maxWidth * effects.scale;
      this.height = animation.maxHeight * effects.scale;
    }

    let inc = 1;
    let rendered = 0;

    // Нормализует y, так как canvas считает 0 верхом, а не низом
    const resolveY = (y: number) => canvas.height - y - this.height;

    const framePayload = {
      ctx: null as CanvasRenderingContext2D | null,
      now: 0,
      delta: 0,
      pattern: false,
      frameIndex: 0,
      animation: null as typeof animation | null,
      x: 0,
      y: 0,
      resolveY
    } as RenderFramePayload;

    const renderFrame: RenderFrame = ({ ctx, pattern, frameIndex, animation, x, y, resolveY }) => {
      const { width: w, height: h } = this;

      if (pattern) {
        const image = animation.getPatternFrame(frameIndex, w, h, effects);
        ctx.drawImage(image, 0, 0, w, h, x, resolveY(y), w, h);

      } else {
        const image = animation.getSpriteFrame(frameIndex, effects);

        // Центрируем спрайт по нижней границе, чтобы изображение "не висело" в воздухе
        // из-за разницы высот между отдельным фреймом и максимальным
        const diffY = h - image.height;
        ctx.drawImage(image, x, resolveY(y) + diffY, image.width, image.height);
      }
    };

    this.#cancelRedrawHandler = this.onDestroy(emitter.on(this.redrawEvent, (payload) => {
      if (this.status.shadowed) {
        return;
      }

      const sprite = spriteAnimation.at(frameIndex)!;

      const x = this.x - camera.x;
      const y = this.y - camera.y - this.visualOffsetY;

      framePayload.ctx = payload.ctx;
      framePayload.now = payload.now;
      framePayload.delta = payload.delta;
      framePayload.pattern = bbox != null;
      framePayload.frameIndex = frameIndex;
      framePayload.animation = animation;
      framePayload.x = x;
      framePayload.y = y;

      this.renderFrame(framePayload, renderFrame);

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

      if (!this.status.paused && (payload.now - lastFrameTime >= duration)) {
        if (params.randomOrder) {
          frameIndex = spriteAnimation.randomIndex();

        } else {
          if (params.loopReverse) {
            if (frameIndex + inc === spriteAnimation.length) {
              inc = -1;

            } else if (frameIndex + inc === params.loopFrom - 1) {
              inc = 1;
            }
          }

          if (frameIndex === spriteAnimation.length - 1) {
            rendered = 2;
          }

          frameIndex = (frameIndex + inc) % spriteAnimation.length;

          if (frameIndex === 0 && rendered > 1) {
            frameIndex += params.loopFrom;
          }
        }

        lastFrameTime = payload.now;
      }

      rendered ||= 1;
    }));
  }

  protected bindFlush() {}

  protected mountFlush() {
    if (this.bindFlush === GameObject.prototype.bindFlush) {
      return;
    }

    const { flush } = this.redrawEvent;

    if (flush == null) {
      return;
    }

    this.onDestroy(this.canvas.emitter.on(flush, () => {
      if (this.destroyed || this.status.shadowed) {
        return;
      }

      this.bindFlush();
    }));
  }

  protected kinematicMove(dx: number, dy: number): number {
    this.prevX = this.x;
    this.prevY = this.y;

    if (!this.status.paused) {
      this.x = this.x + dx;
      this.y = this.y + dy;
    }

    // У подклассов коды могут отличаться
    return 0;
  }

  protected renderFrame(payload: RenderFramePayload, defaultRender: RenderFrame) {
    defaultRender(payload);
  }

  protected onMove(_status: number) {
    // Ничего не делает по умолчанию
  }
}
