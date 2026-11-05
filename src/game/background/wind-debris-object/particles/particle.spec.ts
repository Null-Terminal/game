import { describe, expect, it, vi } from "vitest";

import { AnimationDefinition } from "#/animation-definition";
import { SeededRandom } from "#/utils/seeded-random";

import { LoadedAnimation } from "#engine/animation";

import { WindParticle } from "#game/background/wind-debris-object/particles/particle";
import { roadDebris } from "#game/background/wind-debris-object/presets";

class TestParticle extends WindParticle {
  constructor(random: SeededRandom) {
    super({
      animation: new LoadedAnimation(
        { width: 100, height: 100 } as ImageBitmap,
        new AnimationDefinition({
          sprites: [{ x: 0, y: 0, width: 100, height: 100, duration: 100, spriteId: "" }]
        })
      ),

      random,
      cameraX: 0,
      viewWidth: 900,
      speed: 0,
      lift: 0,
      scale: 1,
      sway: 0,
      opacity: 1,
      wind: roadDebris.wind,
      motion: roadDebris.motion
    });
  }

  protected rotate() {}
}

describe("wind particles", () => {
  it("reuses a particle after it has fully left the viewport", () => {
    const random = new SeededRandom(1);
    const particle = new TestParticle(random);

    particle.x = -particle.radius + 1;
    particle.advance(0, 0, 0, random, 0, 900);
    expect(particle.x).toBe(-particle.radius + 1);

    particle.x = -particle.radius - 1;
    particle.advance(0, 0, 0, random, 0, 900);
    expect(particle.x).toBeGreaterThan(900 + particle.radius);
  });

  it("does not draw a particle outside the vertical viewport", () => {
    const particle = new TestParticle(new SeededRandom(1));
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

    particle.y = 2000;
    particle.draw(ctx, 0, 0, 0, 0, 900, 600);

    expect(drawImage).not.toHaveBeenCalled();
  });
});
