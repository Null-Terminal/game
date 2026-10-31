import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game, WorldObject } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { BBoxTuple } from "#engine/rtree";
import { LoadedAnimation } from "#engine/animation-loader/loaded-animation";

import { ifAlive, ifDead, ifShadowed } from "#engine/game-objects/decorators";
import { KindedObject } from "#engine/game-objects/kinded-object";

import { Movement } from "#engine/game-objects/game-object/movement";
import { GameObjectStatus } from "#engine/game-objects/game-object/status";
import { AnimationPlayback } from "#engine/game-objects/game-object/animation-playback";
import { GameObjectRender } from "#engine/game-objects/game-object/render";
import { GameObjectDebug } from "#engine/game-objects/game-object/debug";

import type * as go from "#engine/game-objects/game-object/types";
import type { BitmapRenderFrame, BitmapRenderPayload } from "#engine/game-objects/game-object/render";

export type * from "#engine/game-objects/game-object/types";

export abstract class GameObject<T extends go.GameObjectOptions = go.GameObjectOptions> extends KindedObject {
  static refs<O extends go.GameObjectOptions>() {
    return <const E extends go.WithMap<O>>(entries: { [I in keyof E]: go.RefOf<O, E[I]> }): E => entries as E;
  }

  static readonly with: go.WithMap = {};

  readonly refs: go.Refs<(typeof GameObject)["with"]> = {};

  acceptor: GameObject | null = null;

  static readonly animations: go.Animations = {};
  readonly animations = GameObject.animations;

  @cache
  static get animationEntries() {
    const entries = Object.entries(this.animations);
    entries.forEach(([name, value]) => {
      if (value instanceof LoadedAnimation) {
        value.name = name;
      }
    });

    return entries;
  }

  readonly animation: EventEmitter<go.AnimationEvents<this["animations"]>> = new EventEmitter({
    ...(this.constructor as typeof GameObject).animationEntries.reduce((map, [name]) => {
      map[name] = handler<string>();
      return map;
    }, {} as any /* WTF TS? */)
  });

  game!: Game;
  poolPointer!: PoolPointer;

  options!: T;
  effects!: go.Effects & Required<Pick<go.Effects, "speed" | "scale">>;
  bbox: BBoxTuple | null = null;

  x = 0;
  prevX = 0;

  y = 0;
  prevY = 0;

  // Из‑за потери точности при работе с дробными числами иногда возникает эффект "парения в воздухе".
  // Это значение используется для визуальной фиксации отображаемого спрайта без реального изменения координат.
  visualOffsetY = 0;

  readonly status = new GameObjectStatus(this);

  @cache
  get render(): GameObjectRender {
    return new GameObjectRender(this);
  }

  @cache
  get movement(): Movement {
    return this.#movement = new Movement(this);
  }

  @cache
  get debug(): GameObjectDebug {
    return new GameObjectDebug(this);
  }

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

  get nowPlaying(): go.PlayableAnimation | null {
    return this.render.nowPlaying;
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

  #movement: Movement | null = null;

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

    this.render.clear();
    this.animation.off();
    this.#movement?.reset();
    this.status.reset();
  }

  reindex(index: number) {
    this.poolPointer = [this.poolPointer[0], index];
  }

  @ifDead
  create(game: Game, poolPointer: PoolPointer, opts?: T): T {
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
  ensurePlaying(animation: go.PlayableAnimation) {
    if (this.nowPlaying !== animation) {
      this.play(animation);
    }
  }

  @ifAlive
  play(animation: go.PlayableAnimation) {
    this.render.stopRedraw();

    const playback = typeof animation === "function" ?
      animation(this) :
      this.#createBitmapPlayback(animation);

    this.render.onRedraw((frame) => {
      playback.draw(frame);

      if (this.options.debug?.outline) {
        this.debug.draw(frame);
      }

      playback.advance?.(frame.elapsed);
    }, animation, () => playback.destroy?.());
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

    this.render.on(flush, () => {
      if (this.destroyed || this.status.shadowed) {
        return;
      }

      this.bindFlush();
    });
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

  #createBitmapPlayback(animation: LoadedAnimation): go.AnimationInstance {
    const playback = new AnimationPlayback(animation);
    const { bbox, effects } = this;

    // Для объекта без bbox фиксируем ширину и высоту по самому широкому спрайту.
    if (bbox == null) {
      this.width = animation.maxWidth * effects.scale;
      this.height = animation.maxHeight * effects.scale;
    }

    const drawDefault: BitmapRenderFrame = ({ ctx, pattern, frameIndex, animation, x, y, toCanvasTop }) => {
      const { width: w, height: h } = this;
      const top = toCanvasTop(y);

      const finiteBounds =
        Number.isFinite(x) && Number.isFinite(top) &&
        Number.isFinite(w) && Number.isFinite(h);

      if (finiteBounds && !this.render.isVisibleInViewport(x, top, x + w, top + h)) {
        return;
      }

      if (pattern) {
        const image = animation.getPatternFrame(frameIndex, w, h, effects);
        ctx.drawImage(image, 0, 0, w, h, x, top, w, h);

      } else {
        const image = animation.getSpriteFrame(frameIndex, effects);

        // Центрируем спрайт по нижней границе, чтобы изображение "не висело" в воздухе.
        const diffY = h - image.height;
        ctx.drawImage(image, x, top + diffY, image.width, image.height);
      }
    };

    return {
      draw: (frame) => {
        const bitmapFrame = frame as BitmapRenderPayload;

        bitmapFrame.pattern = bbox != null;
        bitmapFrame.frameIndex = playback.frameIndex;
        bitmapFrame.animation = animation;

        this.render.drawBitmap(bitmapFrame, drawDefault);

        if (playback.shouldEmitEvent && animation.name in this.animation.events) {
          this.animation.emit(this.animation.events[animation.name]!, playback.sprite.spriteId);
        }
      },

      advance: (elapsed) => playback.advance(elapsed)
    };
  }

  #createRefs() {
    const withMap = (this.constructor as typeof GameObject).with as go.WithMap<T>;

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
      const acceptMap = this.options.accept as go.WithMap<T>;

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
