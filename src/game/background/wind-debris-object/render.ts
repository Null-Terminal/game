import { SeededRandom } from "#/utils/seeded-random";

import type { AnimationInstance } from "#engine/game-objects";
import { GameObjectRender, type ObjectRenderPayload } from "#engine/game-objects/game-object/render";

import type { WindDebrisObject } from "#game/background/wind-debris-object";
import { NewspaperParticle } from "#game/background/wind-debris-object/particles/newspaper";
import type { WindParticle } from "#game/background/wind-debris-object/particles/particle";
import { TumbleweedParticle } from "#game/background/wind-debris-object/particles/tumbleweed";
import { sampleWindRange } from "#game/background/wind-debris-object/utils";
import type { WindDebrisSceneOptions } from "#game/background/wind-debris-object/types";

export class WindDebrisRender extends GameObjectRender<WindDebrisObject> {
  readonly #particles: WindParticle[] = [];

  #scene: WindDebrisSceneOptions | null = null;
  #random: SeededRandom | null = null;
  #lastElapsed = 0;

  #nextGustAt = 0;
  #gustStartedAt = -Infinity;
  #gustDuration = 0;
  #gustStrength = 0;

  createPlayback(scene: WindDebrisSceneOptions): AnimationInstance {
    const random = new SeededRandom(scene.seed);
    const cameraX = this.go.game.camera.x;
    const viewWidth = this.go.canvas.width;
    const { wind, motion, particles } = scene;

    this.#scene = scene;
    this.#random = random;
    this.#particles.length = 0;
    this.#lastElapsed = 0;
    this.#nextGustAt = sampleWindRange(random, wind.initialDelay);
    this.#gustStartedAt = -Infinity;
    this.#gustDuration = 0;
    this.#gustStrength = 0;

    if (particles.tumbleweed != null) {
      for (let i = 0; i < particles.tumbleweed.count; i++) {
        this.#particles.push(new TumbleweedParticle({
          random, cameraX, viewWidth, wind, motion, options: particles.tumbleweed
        }));
      }
    }

    if (particles.newspaper != null) {
      for (let i = 0; i < particles.newspaper.count; i++) {
        this.#particles.push(new NewspaperParticle({
          random, cameraX, viewWidth, wind, motion, options: particles.newspaper
        }));
      }
    }

    return {
      draw: (frame) => this.#drawParticles(frame),
      destroy: () => this.#clear()
    };
  }

  #clear() {
    this.#particles.length = 0;
    this.#scene = null;
    this.#random = null;
  }

  #drawParticles(frame: ObjectRenderPayload) {
    const { ctx, elapsed } = frame;
    const { width, height } = this.go.canvas;
    const scene = this.#scene;
    const random = this.#random;

    if (scene == null || random == null) {
      return;
    }

    const { wind } = scene;
    const cameraX = frame.getScrollOffsetX();
    const cameraY = frame.getScrollOffsetY();
    const delta = Math.min(wind.maxDelta, Math.max(0, (elapsed - this.#lastElapsed) / 1000));

    this.#lastElapsed = elapsed;

    if (elapsed >= this.#nextGustAt) {
      this.#gustStartedAt = elapsed;
      this.#gustDuration = sampleWindRange(random, wind.duration);
      this.#gustStrength = sampleWindRange(random, wind.strength);
      this.#nextGustAt = elapsed + this.#gustDuration + sampleWindRange(random, wind.pause);
    }

    let gust = 0;

    if (elapsed < this.#gustStartedAt + this.#gustDuration) {
      const progress = (elapsed - this.#gustStartedAt) / this.#gustDuration;
      gust = Math.sin(Math.PI * progress) * this.#gustStrength;
    }

    ctx.save();
    // Сохраняем чёткие пиксели при масштабировании и повороте спрайтов
    ctx.imageSmoothingEnabled = false;

    for (const particle of this.#particles) {
      particle.advance(elapsed, delta, gust, cameraX, width);
      particle.draw(ctx, elapsed, gust, cameraX, cameraY, width, height);
    }

    ctx.restore();
  }
}
