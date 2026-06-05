import { cache } from "#decorators/cache";
import type { SpriteAnimation } from "#/sprite-animation";

export class LoadedAnimation {
  name = "";

  readonly image;
  readonly animation: Readonly<SpriteAnimation>;

  @cache
  get maxWidth() {
    let maxWidth = 0;

    for (const sprite of this.animation) {
      maxWidth = Math.max(maxWidth, sprite.width);
    }

    return maxWidth * this.animation.params.scale;
  }

  @cache
  get maxHeight() {
    let maxHeight = 0;

    for (const sprite of this.animation) {
      maxHeight = Math.max(maxHeight, sprite.height);
    }

    return maxHeight * this.animation.params.scale;
  }

  readonly #images: Record<string, ImageBitmap | OffscreenCanvas> = {};
  readonly #patterns: WeakMap<CanvasRenderingContext2D, Record<string, CanvasPattern>> = new WeakMap();

  constructor(image: ImageBitmap, animation: SpriteAnimation) {
    this.image = image;
    this.animation = animation;
  }

  getSpriteFrame(index: number, scale = 1): ImageBitmap | OffscreenCanvas {
    const cacheKey = this.#getKey(index, scale);
    const fromCache = this.#images[cacheKey];

    if (fromCache != null) {
      return fromCache;
    }

    const sprite = this.animation.at(index);

    if (sprite == null) {
      throw new Error(`${this.constructor.name}: Sprite frame ${index} not found (total: ${this.animation.length})`);
    }

    const resolvedScale = this.animation.params.scale * scale;

    const spriteWidth = sprite.width * resolvedScale;
    const spriteHeight = sprite.height * resolvedScale;

    const canvas = new OffscreenCanvas(spriteWidth, spriteHeight);

    canvas.getContext("2d")!.drawImage(
      this.image,

      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,

      0,
      0,
      spriteWidth,
      spriteHeight
    );

    this.#images[cacheKey] = canvas;

    createImageBitmap(canvas).then((image) => {
      this.#images[cacheKey] = image;
    });

    return canvas;
  }

  getPatternFrame(ctx: CanvasRenderingContext2D, index: number, scale = 1): CanvasPattern {
    let patters = this.#patterns.get(ctx);

    if (patters == null) {
      patters = {};
      this.#patterns.set(ctx, patters);
    }

    const cacheKey = this.#getKey(index, scale);
    const fromCache = patters[cacheKey];

    if (fromCache != null) {
      return fromCache;
    }

    const image = this.getSpriteFrame(index, scale);

    const pattern = ctx.createPattern(image, "repeat")!;
    patters[cacheKey] = pattern;

    return pattern;
  }

  #getKey(index: number, scale: number) {
    return `${index}-${scale}`;
  }
}
