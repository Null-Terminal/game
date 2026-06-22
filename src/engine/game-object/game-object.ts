import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game } from "#engine/game";
import type { PoolPointer } from "#engine/game-object-pool";
import type { BBoxTuple } from "#engine/rtree";

import { KindedObject } from "#engine/game-object/kinded";
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
  y = 0;
  bbox: BBoxTuple | null = null;

  get canvas() {
    return this.game.canvas;
  }

  get redrawEvent() {
    return this.game.canvas.events.static;
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
  readonly #destructors: Function[] = [];

  constructor(game: Game, poolPointer: PoolPointer, opts?: GameObjectOptions) {
    super();
    this.create(game, poolPointer, opts);
  }

  abstract init(): void;

  create(game: Game, poolPointer: PoolPointer, opts?: GameObjectOptions) {
    this.game = game;
    this.poolPointer = poolPointer;
    this.options = { ...opts };

    if ("bbox" in this.options) {
      this.bbox = this.options.bbox;
      const [minX, minY, maxX, maxY] = this.bbox;

      this.x = minX;
      this.y = minY;

      this.#width = maxX - minX;
      this.#height = maxY - minY;

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

  register(destructor: Function) {
    this.#destructors.push(destructor);
  }

  destroy() {
    this.#cancelRedrawHandler?.();
    this.#destructors.splice(0, this.#destructors.length).forEach((destroy) => destroy());
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
    const { animation } = selectedAnimation;

    let lastFrameTime = 0;
    let spriteIndex = 0;

    this.#cancelRedrawHandler?.();
    this.#activeAnimation = selectedAnimation;

    const { effects } = this;
    const { emitter } = this.canvas;

    let rendered = false;

    // Для объекта без bbox фиксируем ширину и высоту по самому широкому спрайту
    if (this.bbox == null) {
      this.#width = selectedAnimation.maxWidth * effects.scale;
      this.#height = selectedAnimation.maxHeight * effects.scale;
    }

    this.#cancelRedrawHandler = emitter.on(this.redrawEvent, ([now, ctx]) => {
      const sprite = animation.at(spriteIndex)!;

      if (this.bbox != null) {
        const image = selectedAnimation.getPatternFrame(spriteIndex, effects);
        ctx.drawImage(image, 0, 0, this.width, this.height, this.x, this.y, this.width, this.height);

      } else {
        const image = selectedAnimation.getSpriteFrame(spriteIndex, effects);

        const diffX = this.width - image.width;
        const diffY = this.height - image.height;

        ctx.drawImage(image, this.x + diffX, this.y + diffY, image.width, image.height);
      }

      if ((!rendered || sprite.spriteId !== "") && selectedAnimation.name in this.animation.events) {
        this.animation.emit(this.animation.events[selectedAnimation.name]!, sprite.spriteId);
      }

      const duration = sprite.duration / (animation.params.speed * effects.speed);

      if (!this.isPaused() && (now - lastFrameTime >= duration)) {
        spriteIndex = (spriteIndex + 1) % animation.length;
        lastFrameTime = now;
      }

      rendered = true;
    });
  }
}

