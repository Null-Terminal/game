import { AnimationPlayback } from "#engine/animation";
import type { RenderContext } from "#engine/rendering";
import type { DebugPart } from "#engine/game-objects/game-object/debug";
import type { SeededRandom } from "#/utils/seeded-random";

import { sampleWindRange } from "#game/background/wind-debris-object/utils";
import type { WindParticleParams } from "#game/background/wind-debris-object/types";

export abstract class WindParticle {
  readonly options: Omit<WindParticleParams, "random" | "cameraX" | "viewWidth">;
  readonly #playback: AnimationPlayback;
  readonly #random: SeededRandom;

  // Запас для проверки выхода за экран с учётом поворота спрайта
  readonly radius: number;

  // Положение в мировых координатах
  x: number;
  y: number;

  // Текущий поворот и индивидуальная фаза колебаний
  angle: number;
  phase: number;

  protected constructor({ random, cameraX, viewWidth, ...options }: WindParticleParams) {
    this.options = options;
    this.#random = random;

    const { animation, scale, motion } = options;
    this.#playback = new AnimationPlayback(animation);
    this.radius = Math.hypot(animation.maxWidth, animation.maxHeight) * scale * Math.max(...motion.depthScale) / 2 + motion.boundsMargin;

    this.x = cameraX + random.next() * viewWidth;
    this.y = sampleWindRange(random, motion.altitude);

    this.angle = random.next() * Math.PI * 2;
    this.phase = random.next() * Math.PI * 2;
  }

  advance(
    elapsed: number,
    delta: number,
    gust: number,
    cameraX: number,
    viewWidth: number
  ) {
    const { phase, radius, options } = this;
    const { speed, wind, motion } = options;
    const random = this.#random;

    const turbulence = Math.sin(elapsed / wind.turbulencePeriod + phase) * wind.turbulence;
    const distance = (speed * (wind.calm + gust * wind.gust) + turbulence) * delta;

    this.x -= distance;
    this.rotate(distance, delta, gust);

    const x = this.x - cameraX;

    // Частица переиспользуется после полного ухода за экран
    if (x < -radius || x > viewWidth + radius + motion.rightMargin) {
      this.x = cameraX + viewWidth + radius + sampleWindRange(random, motion.recycleGap);
      this.y = sampleWindRange(random, motion.altitude);
      this.phase = random.next() * Math.PI * 2;
    }
  }

  draw(
    ctx: RenderContext,
    elapsed: number,
    gust: number,
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number,
    collectDebugPart = false
  ): DebugPart | null {
    const { radius, angle, phase, options, x: worldX, y: worldY } = this;
    const { animation, lift, scale: baseScale, motion } = options;

    const [nearScale, farScale] = motion.depthScale;
    const [minAltitude, maxAltitude] = motion.altitude;

    const depth = nearScale + (worldY - minAltitude) / (maxAltitude - minAltitude) * (farScale - nearScale);
    const scale = baseScale * depth;
    const hop = Math.max(0, Math.sin(elapsed / motion.hopPeriod + phase)) * lift * (motion.hopCalm + gust);

    const x = worldX - cameraX + this.sway(elapsed);
    const groundY = viewHeight - worldY + cameraY - hop;
    const boundsY = groundY - this.groundOffset(scale, animation.maxHeight);

    this.#playback.advance(elapsed);

    if (x + radius < 0 || x - radius > viewWidth || boundsY + radius < 0 || boundsY - radius > viewHeight) {
      return null;
    }

    const image = animation.getSpriteFrame(this.#playback.frameIndex);
    const y = groundY - this.groundOffset(scale, image.height);

    const flip = this.flip(elapsed);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    ctx.setTransform(cos * scale * flip, sin * scale * flip, -sin * scale, cos * scale, x, y);
    ctx.globalAlpha = this.opacity(flip);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    if (!collectDebugPart) {
      return null;
    }

    const halfWidth = image.width * scale * Math.abs(flip) / 2;
    const halfHeight = image.height * scale / 2;
    const extentX = Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight;
    const extentY = Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight;

    return {
      bounds: {
        left: Math.max(0, x - extentX),
        top: Math.max(0, y - extentY),
        right: Math.min(viewWidth, x + extentX),
        bottom: Math.min(viewHeight, y + extentY)
      },
      animation,
      frame: this.#playback.frameIndex,
      name: this.constructor.name
    };
  }

  protected abstract rotate(distance: number, delta: number, gust: number): void;

  protected sway(elapsed: number): number {
    const { motion, sway } = this.options;
    return Math.sin(elapsed / motion.swayPeriod + this.phase) * sway;
  }

  protected groundOffset(scale: number, imageHeight: number): number {
    return imageHeight * scale / 2;
  }

  protected flip(_elapsed: number): number {
    return 1;
  }

  protected opacity(_flip: number): number {
    return this.options.opacity;
  }
}
