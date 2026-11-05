import { sampleWindRange } from "#game/background/wind-debris-object/utils";

import { WindParticle } from "#game/background/wind-debris-object/particles/particle";
import type { TumbleweedOptions, WindParticleSpawnParams } from "#game/background/wind-debris-object/types";

import { tumbleweed } from "#/sprites/backgrounds/particles/tumbleweed";

export class TumbleweedParticle extends WindParticle {
  readonly settings: TumbleweedOptions;

  constructor({ random, cameraX, viewWidth, wind, motion, options }: WindParticleSpawnParams<TumbleweedOptions>) {
    super({
      animation: tumbleweed,
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

    this.settings = options;
  }

  protected rotate(distance: number) {
    const { animation, scale } = this.options;
    this.angle -= distance / (animation.maxWidth * scale * this.settings.rollRadius);
  }
}
