import { cache } from "#decorators/cache";

import type { AnimationDefinition } from "#/animation-definition";
import type { BakedFrame, FrameEffects } from "#engine/animation/types";

const MAX_REPEAT_PATTERN_SIZE = 1024;

export class LoadedAnimation {
  name = "";

  readonly image;
  readonly animation: Readonly<AnimationDefinition>;

  @cache
  get maxWidth(): number {
    return this.#maxWidth * this.scale;
  }

  @cache
  get maxHeight(): number {
    return this.#maxHeight * this.scale;
  }

  get collisionBounds() {
    return this.animation.params.collisionBounds;
  }

  @cache
  get scale(): number {
    const { params } = this.animation;

    let scaleX = 0;
    let scaleY = 0;

    if (params.maxWidth != null) {
      scaleX = params.maxWidth / this.#maxWidth;
    }

    if (params.maxHeight != null) {
      scaleY = params.maxHeight / this.#maxHeight;
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

  constructor(image: ImageBitmap, animation: AnimationDefinition) {
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

  getPatternFrame(index: number, width: number, height: number, effects?: FrameEffects): BakedFrame;
  getPatternFrame(index: number, width: number, height: number, axis: "width" | "height", effects?: FrameEffects): BakedFrame;
  getPatternFrame(
    index: number,
    width: number,
    height: number,
    axisOrEffects: "width" | "height" | FrameEffects = {},
    effects: FrameEffects = {}
  ): BakedFrame {
    const axis = typeof axisOrEffects === "string" ? axisOrEffects : null;
    effects = typeof axisOrEffects === "string" ? effects : axisOrEffects;

    const region = axis == null ? null : this.animation.params.repeat?.[axis];
    width = this.#resolveSize(width);
    height = this.#resolveSize(height);

    if (axis != null) {
      width = Math.min(width, MAX_REPEAT_PATTERN_SIZE);
      height = Math.min(height, MAX_REPEAT_PATTERN_SIZE);
    }

    const cacheKey = `${this.#getKey(index, effects, width, height)}-${axis ?? ""}`;
    const fromCache = this.#images[cacheKey];

    if (fromCache != null) {
      return fromCache;
    }

    const sprite = this.animation.at(index);

    if (sprite == null) {
      throw new Error(`${this.constructor.name}: Sprite frame ${index} not found (total: ${this.animation.length})`);
    }

    const image = this.getSpriteFrame(index, effects);
    const tileWidth = this.#getPatternTileSize(region?.width, sprite.width, image.width);
    const tileHeight = this.#getPatternTileSize(region?.height, sprite.height, image.height);

    if (axis != null) {
      width = Math.max(tileWidth, Math.floor(width / tileWidth) * tileWidth);
      height = Math.max(tileHeight, Math.floor(height / tileHeight) * tileHeight);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;

    let source: BakedFrame = image;

    if (region != null) {
      const fragment = new OffscreenCanvas(tileWidth, tileHeight);
      const fragmentCtx = fragment.getContext("2d")!;

      fragmentCtx.drawImage(
        image,
        region.x * image.width / sprite.width,
        region.y * image.height / sprite.height,
        region.width * image.width / sprite.width,
        region.height * image.height / sprite.height,
        0, 0, tileWidth, tileHeight
      );

      source = fragment;
    }

    ctx.fillStyle = ctx.createPattern(source, "repeat")!;
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

  #getPatternTileSize(regionSize: number | undefined, frameSize: number, imageSize: number) {
    return regionSize == null ? imageSize : Math.max(1, Math.round(regionSize * imageSize / frameSize));
  }

  #getKey(index: number, effects: FrameEffects, width = 0, height = 0) {
    return `${index}-${effects.opacity ?? 1}-${effects.scale ?? 1}-${effects.flipX ?? false}-${effects.flipY ?? false}-${width}-${height}`;
  }
}
