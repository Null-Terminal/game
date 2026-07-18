import type { TexturePacker } from "#/sprite-animation/types";
import type { Animation, AnimationParameters, SpriteDescriptor } from "#/sprite-animation/types";

export type * from "#/sprite-animation/types";

export class SpriteAnimation {
  static fromJSON(json: string): SpriteAnimation {
    let data = JSON.parse(json);

    if ("frames" in data) {
      try {
        data = this.fromTexturePacker(data);

      } catch (cause) {
        throw new TypeError(`${this.constructor.name}: TexturePacker parse failed`, { cause });
      }
    }

    if (typeof data !== "object" || !("sprites" in data) || !Array.isArray(data.sprites)) {
      const got = data === null ? "null" : typeof data;
      throw new TypeError(`${this.constructor.name}: expected object with "sprites" array, got ${got}`);
    }

    return new SpriteAnimation(data);
  }

  static fromTexturePacker(data: TexturePacker): { sprites: SpriteDescriptor[] } {
    const sprites: SpriteDescriptor[] = [];

    for (const { frame, duration } of Object.values(data.frames)) {
      sprites.push({
        x: frame.x,
        y: frame.y,
        width: frame.w,
        height: frame.h,
        duration,
        spriteId: ""
      });
    }

    return { sprites };
  }

  get length(): number {
    return this.#sprites.length;
  }

  readonly params: Readonly<AnimationParameters>;

  readonly #sprites: readonly SpriteDescriptor[];

  constructor(animation: Animation) {
    this.#sprites = animation.sprites;

    this.params = {
      speed: 1,
      scale: 1,
      opacity: 1,
      loopFrom: 0,
      loopReverse: false,
      randomOrder: false,
      ...animation.params
    };
  }

  isEmpty() {
    return this.#sprites.length === 0;
  }

  at(index: number): Readonly<SpriteDescriptor> | undefined {
    return this.#sprites.at(index);
  }

  randomIndex(): number {
    return Math.floor(Math.random() * this.#sprites.length);
  }

  toDataURL() {
    const data = encodeURIComponent(JSON.stringify({ params: this.params, sprites: this.#sprites }));
    return `data:application/json,${data}`;
  }

  [Symbol.iterator]() {
    return this.#sprites.values();
  }
}
