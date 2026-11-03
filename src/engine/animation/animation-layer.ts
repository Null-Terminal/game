import { AnimationPlayback } from "#engine/animation/animation-playback";

import type { LoadedAnimation } from "#engine/animation/loaded-animation";
import type { FrameEffects, SpriteAnchorX, SpriteAnchorY } from "#engine/animation/types";

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

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { animation, frameIndex } = this.#playback;

    const image = animation.getSpriteFrame(frameIndex, this.#effects);
    const scale = this.#effects.scale ?? 1;

    const offsetX = animation.visualOffsetX * scale;
    const offsetY = animation.visualOffsetY * scale;

    const anchorWidth = this.#anchorX === "center" ? image.width / 2 : this.#anchorX === "right" ? image.width : 0;
    const anchorHeight = this.#anchorY === "center" ? image.height / 2 : this.#anchorY === "bottom" ? image.height : 0;

    const left = Math.round(x + offsetX - anchorWidth) - Math.round(this.#camera.x);
    const top = ctx.canvas.height - Math.round(y + offsetY) + Math.round(this.#camera.y) - Math.round(anchorHeight);

    if (left < ctx.canvas.width && top < ctx.canvas.height && left + image.width > 0 && top + image.height > 0) {
      ctx.drawImage(image, left, top);
    }
  }
}
