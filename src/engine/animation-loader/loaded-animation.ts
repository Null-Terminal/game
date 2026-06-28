import { cache } from "#decorators/cache";

import type { SpriteAnimation } from "#/sprite-animation";
import type { BakedFrame, FrameEffects } from "#engine/animation-loader/types";

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

    const resolvedScale = this.animation.params.scale * (effects.scale ?? 1);

    const spriteWidth = sprite.width * resolvedScale;
    const spriteHeight = sprite.height * resolvedScale;

    const canvas = new OffscreenCanvas(spriteWidth, spriteHeight);
    const ctx = canvas.getContext("2d")!;

    const flipX = effects.flipX ? -1 : 1;
    const flipY = effects.flipY ? -1 : 1;

    ctx.scale(flipX, flipY);
    ctx.globalAlpha = effects.opacity ?? 1;

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
