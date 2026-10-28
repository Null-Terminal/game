import type { LoadedAnimation } from "#engine/animation-loader";

export class AnimationPlayback {
  readonly animation: LoadedAnimation;

  #frameIndex: number;
  #lastFrameTime = 0;

  #duration: number;
  #direction = 1;
  #rendered = 0;

  constructor(animation: LoadedAnimation) {
    const sprites = animation.animation;

    if (sprites.isEmpty()) {
      throw new RangeError("Cannot play an animation without frames");
    }

    this.animation = animation;
    this.#frameIndex = sprites.params.randomOrder ? sprites.randomIndex() : 0;
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

  advance(now: number, speed: number, paused: boolean) {
    const sprites = this.animation.animation;
    const { params } = sprites;

    if (!paused && now - this.#lastFrameTime >= this.#duration / (params.speed * speed)) {
      if (params.randomOrder) {
        this.#frameIndex = sprites.randomIndex();

      } else {
        if (params.loopReverse) {
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

      this.#lastFrameTime = now;
      this.#duration = this.#pickDuration();
    }

    this.#rendered ||= 1;
  }

  #pickDuration(): number {
    const { animation: sprites } = this.animation;
    const { randomDuration } = sprites.params;

    if (randomDuration == null) {
      return sprites.at(this.#frameIndex)!.duration;
    }

    const [min = 100, max = min] = randomDuration;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
