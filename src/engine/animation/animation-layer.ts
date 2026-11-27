import { AnimationPlayback } from "#engine/animation/animation-playback";

import type { LoadedAnimation } from "#engine/animation/loaded-animation";
import type { FrameEffects, SpriteAnchorX, SpriteAnchorY } from "#engine/animation/types";
import type { RenderContext } from "#engine/rendering";
import type { BBoxTuple } from "#engine/rtree";

export class AnimationLayer {
  readonly #playback: AnimationPlayback;
  readonly #camera: Readonly<{ x: number; y: number }>;
  readonly #effects: FrameEffects;
  readonly #anchorX: SpriteAnchorX;
  readonly #anchorY: SpriteAnchorY;

  constructor(
    animation: LoadedAnimation,
    camera: Readonly<{ x: number; y: number }>,
    effects: FrameEffects,
    anchorX: SpriteAnchorX = "left",
    anchorY: SpriteAnchorY = "bottom"
  ) {
    this.#playback = new AnimationPlayback(animation);
    this.#camera = camera;
    this.#effects = effects;
    this.#anchorX = anchorX;
    this.#anchorY = anchorY;
  }

  advance(elapsed: number) {
    this.#playback.advance(elapsed);
  }

  getCollisionBounds(x: number, y: number): BBoxTuple {
    const { animation } = this.#playback;
    const effectScale = this.#effects.scale ?? 1;

    const width = animation.maxWidth * effectScale;
    const height = animation.maxHeight * effectScale;

    const left = x - this.#anchorOffset(this.#anchorX, "right", width);
    const bottom = y - this.#anchorOffset(this.#anchorY, "top", height);

    const bounds = animation.collisionBounds;

    if (bounds == null) {
      return [left, bottom, left + width, bottom + height];
    }

    const scale = animation.scale * effectScale;

    return [
      left + bounds.x * scale,
      bottom + height - (bounds.y + bounds.height) * scale,
      left + (bounds.x + bounds.width) * scale,
      bottom + height - bounds.y * scale
    ];
  }

  draw(ctx: RenderContext, x: number, y: number) {
    const { animation, frameIndex } = this.#playback;

    const image = animation.getSpriteFrame(frameIndex, this.#effects);
    const anchorWidth = this.#anchorOffset(this.#anchorX, "right", image.width);
    const anchorHeight = this.#anchorOffset(this.#anchorY, "bottom", image.height);

    const left = Math.round(x - anchorWidth) - Math.round(this.#camera.x);
    const top = ctx.canvas.height - Math.round(y) + Math.round(this.#camera.y) - Math.round(anchorHeight);

    if (left < ctx.canvas.width && top < ctx.canvas.height && left + image.width > 0 && top + image.height > 0) {
      ctx.drawImage(image, left, top);
    }
  }

  #anchorOffset(anchor: string, full: string, size: number): number {
    if (anchor === "center") {
      return size / 2;
    }

    return anchor === full ? size : 0;
  }
}
