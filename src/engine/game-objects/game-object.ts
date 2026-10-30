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
import type {
  Animations, AnimationEvents, PlayableAnimation, RenderFrame, RenderFramePayload,
  GameObjectOptions, Effects, WithMap, Refs, RefOf
} from "#engine/game-objects/game-object/types";

export type * from "#engine/game-objects/game-object/types";

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
    entries.forEach(([name, value]) => {
      if (value instanceof LoadedAnimation) {
        value.name = name;
      }
    });

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
  bbox: BBoxTuple | null = null;

  x = 0;
  prevX = 0;

  y = 0;
  prevY = 0;

  // Из‑за потери точности при работе с дробными числами иногда возникает эффект "парения в воздухе".
  // Это значение используется для визуальной фиксации отображаемого спрайта без реального изменения координат.
  visualOffsetY = 0;

  readonly status = new GameObjectStatus(this);
  readonly render = new GameObjectRender(this);

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

  get nowPlaying(): PlayableAnimation | null {
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
  ensurePlaying(animation: PlayableAnimation) {
    if (this.nowPlaying !== animation) {
      this.play(animation);
    }
  }

  @ifAlive
  play(animation: PlayableAnimation) {
    this.render.stopRedraw();

    if (typeof animation === "function") {
      const playback = animation(this);

      this.render.onRedraw((frame) => {
        playback.draw(frame);
        playback.advance?.(frame.elapsed);
      }, animation, () => playback.destroy?.());

      return;
    }

    const playback = new AnimationPlayback(animation);
    const { bbox, effects } = this;

    // Для объекта без bbox фиксируем ширину и высоту по самому широкому спрайту
    if (bbox == null) {
      this.width = animation.maxWidth * effects.scale;
      this.height = animation.maxHeight * effects.scale;
    }

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

    this.render.onRedraw((payload) => {
      const framePayload = payload as RenderFramePayload;

      framePayload.pattern = bbox != null;
      framePayload.frameIndex = playback.frameIndex;
      framePayload.animation = animation;

      this.renderFrame(framePayload, renderFrame);

      if (playback.shouldEmitEvent && animation.name in this.animation.events) {
        this.animation.emit(this.animation.events[animation.name]!, playback.sprite.spriteId);
      }

      playback.advance(payload.elapsed);
    }, animation);
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
    this.debug.draw(payload);
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
