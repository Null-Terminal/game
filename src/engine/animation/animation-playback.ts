import type { LoadedAnimation } from "#engine/animation/loaded-animation";

export class AnimationPlayback {
  readonly animation: LoadedAnimation;

  #frameIndex: number;
  #lastFrameElapsed = 0;

  #duration: number;
  #direction = 1;
  #rendered = 0;

  constructor(animation: LoadedAnimation) {
    const sprites = animation.animation;

    if (sprites.isEmpty()) {
      throw new RangeError("Cannot play an animation without frames");
    }

    this.animation = animation;
    this.#frameIndex = sprites.params.order === "random" ? sprites.randomIndex() : 0;
    this.#duration = this.#pickDuration();
  }

  get frameIndex(): number {
    return this.#frameIndex;
  }

  get sprite() {
    return this.animation.animation.at(this.#frameIndex)!;
  }

  get shouldEmitEvent(): boolean {
    return this.#rendered === 0 || this.sprite.spriteId !== "";
  }

  advance(elapsed: number) {
    const sprites = this.animation.animation;
    const { params } = sprites;

    if (elapsed - this.#lastFrameElapsed >= this.#duration / params.speed) {
      if (params.order === "random") {
        this.#frameIndex = sprites.randomIndex();

      } else {
        if (params.order === "ping-pong") {
          if (this.#frameIndex + this.#direction === sprites.length) {
            this.#direction = -1;

          } else if (this.#frameIndex + this.#direction === params.loopFrom - 1) {
            this.#direction = 1;
          }
        }

        if (this.#frameIndex === sprites.length - 1) {
          this.#rendered = 2;
        }

        this.#frameIndex = (this.#frameIndex + this.#direction) % sprites.length;

        if (this.#frameIndex === 0 && this.#rendered > 1) {
          this.#frameIndex += params.loopFrom;
        }
      }

      this.#lastFrameElapsed = elapsed;
      this.#duration = this.#pickDuration();
    }

    this.#rendered ||= 1;
  }

  #pickDuration(): number {
    const { animation: sprites } = this.animation;
    const { frameDurationRange } = sprites.params;

    if (frameDurationRange == null) {
      return sprites.at(this.#frameIndex)!.duration;
    }

    const [min, max] = frameDurationRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
