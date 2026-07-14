import { cache } from "#decorators/cache";

import type { SpriteAnimation } from "#/sprite-animation";
import type { BakedFrame, FrameEffects } from "#engine/animation-loader/types";

export class LoadedAnimation {
  name = "";

  readonly image;
  readonly animation: Readonly<SpriteAnimation>;

  @cache
  get maxWidth(): number {
    return this.#maxWidth * this.scale;
  }

  @cache
  get maxHeight(): number {
    return this.#maxHeight * this.scale;
  }

  @cache
  get scale(): number {
    const { params } = this.animation;

    let scaleX = 0;
    let scaleY = 0;

    if (params.width != null) {
      scaleX = params.width / this.#maxWidth;
    }

    if (params.height != null) {
      scaleY = params.height / this.#maxHeight;
    }

    if (scaleX > 0 && scaleY > 0) {
      return Math.min(scaleX, scaleY) * params.scale;
    }

    return (scaleX || scaleY || 1) * params.scale;
  }

  @cache
  get #maxWidth(): number {
    let maxWidth = 0;

    for (const sprite of this.animation) {
      maxWidth = Math.max(maxWidth, sprite.width);
    }

    return maxWidth;
  }

  @cache
  get #maxHeight(): number {
    let maxHeight = 0;

    for (const sprite of this.animation) {
      maxHeight = Math.max(maxHeight, sprite.height);
    }

    return maxHeight;
  }

  readonly #images: Record<string, ImageBitmap | OffscreenCanvas> = {};

  constructor(image: ImageBitmap, animation: SpriteAnimation) {
    this.image = image;
    this.animation = animation;
  }

  getSpriteFrame(index: number, effects: FrameEffects = {}): BakedFrame {
    const cacheKey = this.#getKey(index, effects);
    const fromCache = this.#images[cacheKey];

    if (fromCache != null) {
      return fromCache;
    }

    const sprite = this.animation.at(index);

    if (sprite == null) {
      throw new Error(`${this.constructor.name}: Sprite frame ${index} not found (total: ${this.animation.length})`);
    }

    const resolvedScale = this.scale * (effects.scale ?? 1);

    const spriteWidth = sprite.width * resolvedScale;
    const spriteHeight = sprite.height * resolvedScale;

    const canvas = new OffscreenCanvas(spriteWidth, spriteHeight);
    const ctx = canvas.getContext("2d")!;

    const flipX = effects.flipX ? -1 : 1;
    const flipY = effects.flipY ? -1 : 1;

    ctx.scale(flipX, flipY);
    ctx.globalAlpha = effects.opacity ?? this.animation.params.opacity;

    ctx.drawImage(
      this.image,

      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,

      0,
      0,
      spriteWidth * flipX,
      spriteHeight * flipY
    );

    this.#images[cacheKey] = canvas;

    createImageBitmap(canvas).then((image) => {
      this.#images[cacheKey] = image;
    });

    return canvas;
  }

  getPatternFrame(index: number, width: number, height: number, effects: FrameEffects = {}): BakedFrame {
    width = this.#resolveSize(width);
    height = this.#resolveSize(height);

    const cacheKey = this.#getKey(index, effects, width, height);
    const fromCache = this.#images[cacheKey];

    if (fromCache != null) {
      return fromCache;
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;

    const image = this.getSpriteFrame(index, effects);

    ctx.fillStyle = ctx.createPattern(image, "repeat")!;
    ctx.fillRect(0, 0, width, height);

    this.#images[cacheKey] = canvas;

    createImageBitmap(canvas).then((image) => {
      this.#images[cacheKey] = image;
    });

    return canvas;
  }

  #resolveSize(size: number): number {
    if (size < 32) {
      return 32;
    }

    if (size < 64) {
      return 64;
    }

    if (size < 128) {
      return 128;
    }

    if (size < 256) {
      return 256;
    }

    if (size < 512) {
      return 512;
    }

    if (size < 1024) {
      return 1024;
    }

    return size;
  }

  #getKey(index: number, effects: FrameEffects, width = 0, height = 0) {
    return `${index}-${effects.opacity ?? 1}-${effects.scale ?? 1}-${effects.flipX ?? false}-${effects.flipY ?? false}-${width}-${height}`;
  }
}
