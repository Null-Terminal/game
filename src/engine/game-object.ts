import { cache } from "#decorators/cache";
import { EventEmitter, handler } from "#/event-emitter";

import type { Game } from "#engine/game";
import type { BBoxTuple } from "#engine/rtree";

import { KindedObject } from "#engine/game-object/kinded";
import type { Animations, AnimationEvents, GameObjectOptions, Effects } from "#engine/game-object/types";

export * from "#engine/game-object/types";

export abstract class GameObject extends KindedObject {
  static animations: Animations = {};

  @cache
  static get animationEntries(){
    const entries = Object.entries(this.animations);

    entries.forEach(([name, value]) => {
      value.name = name;
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
    const { animation } = selectedAnimation;

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
      this.#width = selectedAnimation.maxWidth * effects.scale;
      this.#height = selectedAnimation.maxHeight * effects.scale;
    }

    this.#cancelRedrawHandler = emitter.on(events.redraw, ([now, ctx]) => {
      ctx.save();

      const sprite = animation.at(spriteIndex)!;

      if (this.bbox != null) {
        ctx.fillStyle = selectedAnimation.getPatternFrame(ctx, spriteIndex);
        ctx.fillRect(this.x, this.y, this.width, this.height);

      } else {
        const image = selectedAnimation.getSpriteFrame(spriteIndex, effects.scale);

        let x = this.x;
        let y = this.y;

        if (effects.flipX) {
          x = -x - this.width;
        }

        if (effects.flipY) {
          y = -y - this.height;
        }

        ctx.scale(effects.flipX ? -1 : 1, effects.flipY ? -1 : 1);
        ctx.drawImage(image, x, y, image.width, image.height);
      }

      ctx.restore();

      if ((!rendered || sprite.spriteId !== "") && selectedAnimation.name in this.animation.events) {
        this.animation.emit(this.animation.events[selectedAnimation.name]!, sprite.spriteId);
      }

      if (!this.isPaused() && (now - lastFrameTime >= sprite.duration / effects.speed)) {
        spriteIndex = (spriteIndex + 1) % animation.length;
        lastFrameTime = now;
      }

      rendered = true;
    });
  }
}
