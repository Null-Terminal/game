import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game, WorldObject } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { BBoxTuple } from "#engine/rtree";

import { ifAlive, ifShadowed } from "#engine/game-objects/decorators";
import { KindedObject } from "#engine/game-objects/kinded-object";
import { drawDebugOutline } from "#engine/game-objects/debug-drawing";

import { Movement } from "#engine/game-objects/movement";
import { GameObjectStatus } from "#engine/game-objects/game-object-status";

import type { Animations, AnimationEvents } from "#engine/game-objects/types";
import type { RenderFrame, RenderFramePayload } from "#engine/game-objects/types";
import type { GameObjectOptions, Effects, WithMap, Refs, RefOf } from "#engine/game-objects/types";

export abstract class GameObject<T extends GameObjectOptions = GameObjectOptions> extends KindedObject {
  static refs<O extends GameObjectOptions>() {
    return <const E extends WithMap<O>>(entries: { [I in keyof E]: RefOf<O, E[I]> }): E => entries as E;
  }

  static readonly with: WithMap = {};

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
  #cancelRedrawHandler: (() => void) | null = null;

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

    this.#cancelRedrawHandler?.();
    this.#cancelRedrawHandler = null;
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

    const options = { ...opts! } as T;
    this.options = options;

    try {
      this.#initializeState(options);
      this.#createRefs();
      this.init();

      if (options.show != null && options.show in this.animations) {
        this.play(this.animations[options.show]!);
      }

      if (options.movement != null) {
        this.movement.follow(options.movement);
      }

      this.mountFlush();
      return options;

    } catch (err) {
      this.destroy();
      throw err;
    }
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

    if (spriteAnimation.isEmpty()) {
      throw new RangeError("Cannot play an animation without frames");
    }

    let lastFrameTime = 0;
    let frameIndex = params.randomOrder ? spriteAnimation.randomIndex() : 0;

    const pickDuration = () => {
      if (params.randomDuration == null) {
        return spriteAnimation.at(frameIndex)!.duration;
      }

      const [min = 100, max = min] = params.randomDuration;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    let duration = pickDuration();

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

      const top = resolveY(y);

      const finiteBounds =
        Number.isFinite(x) && Number.isFinite(top) &&
        Number.isFinite(w) && Number.isFinite(h);

      if (finiteBounds && !this.isVisibleInViewport(x, top, x + w, top + h)) {
        return;
      }

      if (pattern) {
        const image = animation.getPatternFrame(frameIndex, w, h, effects);
        ctx.drawImage(image, 0, 0, w, h, x, top, w, h);

      } else {
        const image = animation.getSpriteFrame(frameIndex, effects);

        // Центрируем спрайт по нижней границе, чтобы изображение "не висело" в воздухе
        // из-за разницы высот между отдельным фреймом и максимальным
        const diffY = h - image.height;
        ctx.drawImage(image, x, top + diffY, image.width, image.height);
      }
    };

    this.#cancelRedrawHandler = emitter.on(this.redrawEvent, (payload) => {
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
      this.drawDebug(framePayload);

      if ((!rendered || sprite.spriteId !== "") && animation.name in this.animation.events) {
        this.animation.emit(this.animation.events[animation.name]!, sprite.spriteId);
      }

      if (!this.status.paused && (payload.now - lastFrameTime >= duration / (params.speed * effects.speed))) {
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
        duration = pickDuration();
      }

      rendered ||= 1;
    });
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

  protected isVisibleInViewport(left: number, top: number, right: number, bottom: number): boolean {
    const { width, height } = this.canvas.canvas;
    return left < right && top < bottom && left < width && right > 0 && top < height && bottom > 0;
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

  protected drawDebug({ ctx, x, y }: RenderFramePayload) {
    const { width, height } = this;

    const outline = this.options.debug?.outline;

    if (!outline || Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(width) || Number.isNaN(height)) {
      return;
    }

    const { width: viewWidth, height: viewHeight } = this.canvas.canvas;

    const left = Math.max(0, x);
    const right = Number.isFinite(width) ? Math.min(viewWidth, x + width) : viewWidth;

    const rawBottom = viewHeight - y;
    const top = Number.isFinite(height) ? Math.max(0, rawBottom - height) : 0;
    const bottom = Math.min(viewHeight, rawBottom);

    drawDebugOutline(ctx, outline, left, top, right, bottom);
  }

  protected onMove(_status: number) {
    // Ничего не делает по умолчанию
  }

  #initializeState(options: T) {
    this.x = 0;
    this.y = 0;

    this.width = 0;
    this.height = 0;

    this.visualOffsetY = 0;
    this.bbox = null;

    if ("bbox" in options && options.bbox != null) {
      const [minX, minY, maxX, maxY] = options.bbox;
      this.bbox = options.bbox;

      this.x = minX;
      this.y = minY;

      this.width = Number.isFinite(minX) && Number.isFinite(maxX) ? maxX - minX : Infinity;
      this.height = Number.isFinite(minY) && Number.isFinite(maxY) ? maxY - minY : Infinity;

    } else {
      if ("x" in options) {
        this.x = options.x ?? 0;
      }

      if ("y" in options) {
        this.y = options.y ?? 0;
      }
    }

    this.prevX = this.x;
    this.prevY = this.y;
    this.effects = { scale: 1, speed: 1, ...options.effects };
    this.acceptor = options.acceptor ?? null;
  }

  #createRefs() {
    const withMap = (this.constructor as typeof GameObject).with as WithMap<T>;

    for (const [name, entry] of Object.entries(withMap)) {
      const [go, childOptions] = typeof entry === "function" ? entry(this.options) : entry;
      const resolvedOptions = { ...this.options, x: 0, y: 0, ...childOptions, acceptor: this };

      if (childOptions != null) {
        // Бесконечный край не сдвигает детей: -Infinity + x остаётся -Infinity
        const originX = Number.isFinite(this.x) ? this.x : 0;
        const originY = Number.isFinite(this.y) ? this.y : 0;

        if ("bbox" in childOptions && childOptions.bbox != null) {
          const { bbox } = childOptions;
          resolvedOptions.bbox = [bbox[0] + originX, bbox[1] + originY, bbox[2] + originX, bbox[3] + originY];

        } else {
          // Коробка родителя не наследуется: bbox ребёнка задаёт только его запись
          delete resolvedOptions.bbox;
          resolvedOptions.x = (resolvedOptions.x ?? 0) + originX;
          resolvedOptions.y = (resolvedOptions.y ?? 0) + originY;
        }
      }

      this.#createRef(name, go, resolvedOptions);
    }

    if (this.options.accept != null) {
      const acceptMap = this.options.accept as WithMap<T>;

      for (const [name, entry] of Object.entries(acceptMap)) {
        const [go, childOptions] = typeof entry === "function" ? entry(this.options) : entry;
        this.#createRef(name, go, { ...childOptions, acceptor: this });
      }
    }
  }

  #createRef(name: string, go: WorldObject[0], options: WorldObject[1]) {
    const instance = this.world.objects.get(...this.world.createObject(go, options))!;
    this.refs[name] = instance;

    this.onDestroy(() => {
      const [kind, index] = instance.poolPointer;
      this.world.objects.delete(kind, index);

      instance.acceptor = null;
      this.refs[name] = null;
    });
  }
}
