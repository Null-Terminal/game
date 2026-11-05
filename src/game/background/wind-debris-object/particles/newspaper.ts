import { sampleWindRange } from "#game/background/wind-debris-object/utils";

import { WindParticle } from "#game/background/wind-debris-object/particles/particle";
import type { NewspaperOptions, WindParticleSpawnParams } from "#game/background/wind-debris-object/types";

import { newspaper } from "#/sprites/backgrounds/particles/newspaper";

export class NewspaperParticle extends WindParticle {
  readonly #spin: number;
  readonly settings: NewspaperOptions;

  constructor({ random, cameraX, viewWidth, wind, motion, options }: WindParticleSpawnParams<NewspaperOptions>) {
    super({
      animation: newspaper,
      random,
      cameraX,
      viewWidth,
      speed: sampleWindRange(random, options.speed),
      lift: sampleWindRange(random, options.lift),
      scale: sampleWindRange(random, options.scale),
      sway: options.sway,
      opacity: options.opacity,
      wind,
      motion
    });

    this.#spin = sampleWindRange(random, options.spin);
    this.settings = options;
  }

  protected rotate(_distance: number, delta: number, gust: number) {
    this.angle += this.#spin * delta * (this.settings.spinCalm + gust);
  }

  protected override groundOffset(): number {
    return this.settings.groundOffset;
  }

  protected override flip(elapsed: number): number {
    return Math.cos(elapsed / this.settings.tumblePeriod + this.phase);
  }

  protected override opacity(flip: number): number {
    const min = this.settings.minFlipOpacity;
    return this.options.opacity * (min + Math.abs(flip) * (1 - min));
  }
}
