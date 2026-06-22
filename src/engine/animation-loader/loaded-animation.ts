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

  getPatternFrame(index: number, effects: FrameEffects = {}): BakedFrame {
    const cacheKey = this.#getKey(index, effects, true);
    const fromCache = this.#images[cacheKey];

    if (fromCache != null) {
      return fromCache;
    }

    const SIZE = 3840;

    const canvas = new OffscreenCanvas(SIZE, SIZE);
    const ctx = canvas.getContext("2d")!;

    const image = this.getSpriteFrame(index, effects);

    ctx.fillStyle = ctx.createPattern(image, "repeat")!;
    ctx.fillRect(0, 0, SIZE, SIZE);

    this.#images[cacheKey] = canvas;

    createImageBitmap(canvas).then((image) => {
      this.#images[cacheKey] = image;
    });

    return canvas;
  }

  #getKey(index: number, effects: FrameEffects, pattern = false) {
    return `${index}-${effects.scale ?? 1}-${effects.flipX ?? false}-${effects.flipY ?? false}-${pattern}`;
  }
}
