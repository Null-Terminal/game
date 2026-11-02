import type { TexturePacker } from "#/animation-definition/types";
import type { Animation, AnimationParameters, SpriteDescriptor } from "#/animation-definition/types";
import { isInRange } from "#/utils/validators";

export type * from "#/animation-definition/types";

export class AnimationDefinition {
  static fromJSON(json: string): AnimationDefinition {
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

    return new AnimationDefinition(data);
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

    const order = animation.params?.order ?? "forward";

    switch (order) {
      case "forward":
      case "ping-pong":
      case "random":
        break;

      default:
        throw new RangeError(`Unknown animation order: ${order}`);
    }

    this.params = {
      speed: 1,
      scale: 1,
      opacity: 1,
      loopFrom: 0,
      ...animation.params,
      order
    };

    for (const axis of ["width", "height"] as const) {
      const region = this.params.repeat?.[axis];

      if (region == null) {
        continue;
      }

      const { x, y, width, height } = region;
      const validSize = isInRange(x, 0, Infinity) && isInRange(y, 0, Infinity) &&
        isInRange(width, 0, Infinity) && isInRange(height, 0, Infinity) &&
        width > 0 && height > 0;

      if (!validSize || this.#sprites.some((sprite) => x + width > sprite.width || y + height > sprite.height)) {
        throw new RangeError(`repeat.${axis} must fit within every sprite frame`);
      }
    }
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
